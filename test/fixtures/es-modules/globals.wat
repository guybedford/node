(module
  (type (;0;) (func (result i32)))
  (type (;1;) (func (result i64)))
  (type (;2;) (func (result f32)))
  (type (;3;) (func (result f64)))
  (type (;4;) (func (param i32)))
  (type (;5;) (func (param i64)))
  (type (;6;) (func (param f32)))
  (type (;7;) (func (param f64)))
  (import "./globals.js" "🚀i32_value" (global $imported_i32 (;0;) i32))
  (import "./globals.js" "i32_mut_value" (global $imported_mut_i32 (;1;) (mut i32)))
  (import "./globals.js" "i64_value" (global $imported_i64 (;2;) i64))
  (import "./globals.js" "i64_mut_value" (global $imported_mut_i64 (;3;) (mut i64)))
  (import "./globals.js" "f32_value" (global $imported_f32 (;4;) f32))
  (import "./globals.js" "f32_mut_value" (global $imported_mut_f32 (;5;) (mut f32)))
  (import "./globals.js" "f64_value" (global $imported_f64 (;6;) f64))
  (import "./globals.js" "f64_mut_value" (global $imported_mut_f64 (;7;) (mut f64)))
  (global $local_i32 (;8;) i32 i32.const 42)
  (global $local_mut_i32 (;9;) (mut i32) i32.const 100)
  (global $local_i64 (;10;) i64 i64.const 9223372036854775807)
  (global $local_mut_i64 (;11;) (mut i64) i64.const 200)
  (global $local_f32 (;12;) f32 f32.const 0x1.921fap+1 (;=3.14159;))
  (global $local_mut_f32 (;13;) (mut f32) f32.const 0x1.5bf09ap+1 (;=2.71828;))
  (global $local_f64 (;14;) f64 f64.const 0x1.5bf0a8b145769p+1 (;=2.718281828459045;))
  (global $local_mut_f64 (;15;) (mut f64) f64.const 0x1.921fb54442d18p+1 (;=3.141592653589793;))
  (export "getImportedI32" (func 0))
  (export "getImportedMutI32" (func 1))
  (export "getImportedI64" (func 2))
  (export "getImportedMutI64" (func 3))
  (export "getImportedF32" (func 4))
  (export "getImportedMutF32" (func 5))
  (export "getImportedF64" (func 6))
  (export "getImportedMutF64" (func 7))
  (export "setImportedMutI32" (func 8))
  (export "setImportedMutI64" (func 9))
  (export "setImportedMutF32" (func 10))
  (export "setImportedMutF64" (func 11))
  (export "🚀localI32" (global $local_i32))
  (export "localMutI32" (global $local_mut_i32))
  (export "localI64" (global $local_i64))
  (export "localMutI64" (global $local_mut_i64))
  (export "localF32" (global $local_f32))
  (export "localMutF32" (global $local_mut_f32))
  (export "localF64" (global $local_f64))
  (export "localMutF64" (global $local_mut_f64))
  (export "getLocalI32" (func 12))
  (export "getLocalMutI32" (func 13))
  (export "getLocalI64" (func 14))
  (export "getLocalMutI64" (func 15))
  (export "getLocalF32" (func 16))
  (export "getLocalMutF32" (func 17))
  (export "getLocalF64" (func 18))
  (export "getLocalMutF64" (func 19))
  (export "setLocalMutI32" (func 20))
  (export "setLocalMutI64" (func 21))
  (export "setLocalMutF32" (func 22))
  (export "setLocalMutF64" (func 23))
  (func (;0;) (type 0) (result i32)
    global.get $imported_i32
  )
  (func (;1;) (type 0) (result i32)
    global.get $imported_mut_i32
  )
  (func (;2;) (type 1) (result i64)
    global.get $imported_i64
  )
  (func (;3;) (type 1) (result i64)
    global.get $imported_mut_i64
  )
  (func (;4;) (type 2) (result f32)
    global.get $imported_f32
  )
  (func (;5;) (type 2) (result f32)
    global.get $imported_mut_f32
  )
  (func (;6;) (type 3) (result f64)
    global.get $imported_f64
  )
  (func (;7;) (type 3) (result f64)
    global.get $imported_mut_f64
  )
  (func (;8;) (type 4) (param i32)
    local.get 0
    global.set $imported_mut_i32
  )
  (func (;9;) (type 5) (param i64)
    local.get 0
    global.set $imported_mut_i64
  )
  (func (;10;) (type 6) (param f32)
    local.get 0
    global.set $imported_mut_f32
  )
  (func (;11;) (type 7) (param f64)
    local.get 0
    global.set $imported_mut_f64
  )
  (func (;12;) (type 0) (result i32)
    global.get $local_i32
  )
  (func (;13;) (type 0) (result i32)
    global.get $local_mut_i32
  )
  (func (;14;) (type 1) (result i64)
    global.get $local_i64
  )
  (func (;15;) (type 1) (result i64)
    global.get $local_mut_i64
  )
  (func (;16;) (type 2) (result f32)
    global.get $local_f32
  )
  (func (;17;) (type 2) (result f32)
    global.get $local_mut_f32
  )
  (func (;18;) (type 3) (result f64)
    global.get $local_f64
  )
  (func (;19;) (type 3) (result f64)
    global.get $local_mut_f64
  )
  (func (;20;) (type 4) (param i32)
    local.get 0
    global.set $local_mut_i32
  )
  (func (;21;) (type 5) (param i64)
    local.get 0
    global.set $local_mut_i64
  )
  (func (;22;) (type 6) (param f32)
    local.get 0
    global.set $local_mut_f32
  )
  (func (;23;) (type 7) (param f64)
    local.get 0
    global.set $local_mut_f64
  )
)
