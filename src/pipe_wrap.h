// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

#ifndef SRC_PIPE_WRAP_H_
#define SRC_PIPE_WRAP_H_

#if defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS

#include "async_wrap.h"
#include "connection_wrap.h"
#include "node_messaging.h"

namespace node {

class ExternalReferenceRegistry;
class Environment;

class PipeWrap : public ConnectionWrap<PipeWrap, uv_pipe_t> {
 public:
  enum SocketType {
    SOCKET,
    SERVER,
    IPC
  };

  static v8::MaybeLocal<v8::Object> Instantiate(Environment* env,
                                                AsyncWrap* parent,
                                                SocketType type);
  static void Initialize(v8::Local<v8::Object> target,
                         v8::Local<v8::Value> unused,
                         v8::Local<v8::Context> context,
                         void* priv);

  static void RegisterExternalReferences(ExternalReferenceRegistry* registry);
  SET_NO_MEMORY_INFO()
  SET_MEMORY_INFO_NAME(PipeWrap)
  SET_SELF_SIZE(PipeWrap)

#ifndef _WIN32
  // Transfer the underlying pipe to another thread via .postMessage(),
  // mirroring TCPWrap: the fd is dup()ed and re-adopted (uv_pipe_open) in the
  // receiving event loop. IPC-mode pipes are not transferable. Not supported
  // on Windows, consistent with pipe handles over the child_process IPC
  // channel.
  BaseObject::TransferMode GetTransferMode() const override;
  std::unique_ptr<worker::TransferData> TransferForMessaging() override;
#endif

 private:
#ifndef _WIN32
  class TransferData : public worker::TransferData {
   public:
    explicit TransferData(int fd, SocketType type) : fd_(fd), type_(type) {}
    ~TransferData() override;

    BaseObjectPtr<BaseObject> Deserialize(
        Environment* env,
        v8::Local<v8::Context> context,
        std::unique_ptr<worker::TransferData> self) override;

    SET_NO_MEMORY_INFO()
    SET_MEMORY_INFO_NAME(PipeWrapTransferData)
    SET_SELF_SIZE(TransferData)

   private:
    int fd_;
    SocketType type_;
  };
#endif

  PipeWrap(Environment* env,
           v8::Local<v8::Object> object,
           ProviderType provider,
           bool ipc);

  static void New(const v8::FunctionCallbackInfo<v8::Value>& args);
#ifndef _WIN32
  static void SocketPair(const v8::FunctionCallbackInfo<v8::Value>& args);
#endif
  static void Bind(const v8::FunctionCallbackInfo<v8::Value>& args);
  static void Listen(const v8::FunctionCallbackInfo<v8::Value>& args);
  static void Connect(const v8::FunctionCallbackInfo<v8::Value>& args);
  static void Open(const v8::FunctionCallbackInfo<v8::Value>& args);

#ifdef _WIN32
  static void SetPendingInstances(
      const v8::FunctionCallbackInfo<v8::Value>& args);
#endif
  static void Fchmod(const v8::FunctionCallbackInfo<v8::Value>& args);
};


}  // namespace node

#endif  // defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS

#endif  // SRC_PIPE_WRAP_H_
