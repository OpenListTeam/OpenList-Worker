
/**
 * Client
**/

import * as runtime from './runtime/client.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model mount
 * 
 */
export type mount = $Result.DefaultSelection<Prisma.$mountPayload>
/**
 * Model users
 * 
 */
export type users = $Result.DefaultSelection<Prisma.$usersPayload>
/**
 * Model oauth
 * 
 */
export type oauth = $Result.DefaultSelection<Prisma.$oauthPayload>
/**
 * Model binds
 * 
 */
export type binds = $Result.DefaultSelection<Prisma.$bindsPayload>
/**
 * Model crypt
 * 
 */
export type crypt = $Result.DefaultSelection<Prisma.$cryptPayload>
/**
 * Model mates
 * 
 */
export type mates = $Result.DefaultSelection<Prisma.$matesPayload>
/**
 * Model share
 * 
 */
export type share = $Result.DefaultSelection<Prisma.$sharePayload>
/**
 * Model token
 * 
 */
export type token = $Result.DefaultSelection<Prisma.$tokenPayload>
/**
 * Model tasks
 * 
 */
export type tasks = $Result.DefaultSelection<Prisma.$tasksPayload>
/**
 * Model fetch
 * 
 */
export type fetch = $Result.DefaultSelection<Prisma.$fetchPayload>
/**
 * Model group
 * 
 */
export type group = $Result.DefaultSelection<Prisma.$groupPayload>
/**
 * Model cache
 * 
 */
export type cache = $Result.DefaultSelection<Prisma.$cachePayload>
/**
 * Model admin
 * 
 */
export type admin = $Result.DefaultSelection<Prisma.$adminPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Mounts
 * const mounts = await prisma.mount.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Mounts
   * const mounts = await prisma.mount.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>

  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.mount`: Exposes CRUD operations for the **mount** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Mounts
    * const mounts = await prisma.mount.findMany()
    * ```
    */
  get mount(): Prisma.mountDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.users`: Exposes CRUD operations for the **users** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.users.findMany()
    * ```
    */
  get users(): Prisma.usersDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.oauth`: Exposes CRUD operations for the **oauth** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Oauths
    * const oauths = await prisma.oauth.findMany()
    * ```
    */
  get oauth(): Prisma.oauthDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.binds`: Exposes CRUD operations for the **binds** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Binds
    * const binds = await prisma.binds.findMany()
    * ```
    */
  get binds(): Prisma.bindsDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.crypt`: Exposes CRUD operations for the **crypt** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Crypts
    * const crypts = await prisma.crypt.findMany()
    * ```
    */
  get crypt(): Prisma.cryptDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.mates`: Exposes CRUD operations for the **mates** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Mates
    * const mates = await prisma.mates.findMany()
    * ```
    */
  get mates(): Prisma.matesDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.share`: Exposes CRUD operations for the **share** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Shares
    * const shares = await prisma.share.findMany()
    * ```
    */
  get share(): Prisma.shareDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.token`: Exposes CRUD operations for the **token** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Tokens
    * const tokens = await prisma.token.findMany()
    * ```
    */
  get token(): Prisma.tokenDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.tasks`: Exposes CRUD operations for the **tasks** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Tasks
    * const tasks = await prisma.tasks.findMany()
    * ```
    */
  get tasks(): Prisma.tasksDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.fetch`: Exposes CRUD operations for the **fetch** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Fetches
    * const fetches = await prisma.fetch.findMany()
    * ```
    */
  get fetch(): Prisma.fetchDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.group`: Exposes CRUD operations for the **group** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Groups
    * const groups = await prisma.group.findMany()
    * ```
    */
  get group(): Prisma.groupDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.cache`: Exposes CRUD operations for the **cache** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Caches
    * const caches = await prisma.cache.findMany()
    * ```
    */
  get cache(): Prisma.cacheDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.admin`: Exposes CRUD operations for the **admin** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Admins
    * const admins = await prisma.admin.findMany()
    * ```
    */
  get admin(): Prisma.adminDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 7.0.1
   * Query Engine version: f09f2815f091dbba658cdcd2264306d88bb5bda6
   */
  export type PrismaVersion = {
    client: string
    engine: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    mount: 'mount',
    users: 'users',
    oauth: 'oauth',
    binds: 'binds',
    crypt: 'crypt',
    mates: 'mates',
    share: 'share',
    token: 'token',
    tasks: 'tasks',
    fetch: 'fetch',
    group: 'group',
    cache: 'cache',
    admin: 'admin'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]



  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "mount" | "users" | "oauth" | "binds" | "crypt" | "mates" | "share" | "token" | "tasks" | "fetch" | "group" | "cache" | "admin"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      mount: {
        payload: Prisma.$mountPayload<ExtArgs>
        fields: Prisma.mountFieldRefs
        operations: {
          findUnique: {
            args: Prisma.mountFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$mountPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.mountFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$mountPayload>
          }
          findFirst: {
            args: Prisma.mountFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$mountPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.mountFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$mountPayload>
          }
          findMany: {
            args: Prisma.mountFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$mountPayload>[]
          }
          create: {
            args: Prisma.mountCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$mountPayload>
          }
          createMany: {
            args: Prisma.mountCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.mountCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$mountPayload>[]
          }
          delete: {
            args: Prisma.mountDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$mountPayload>
          }
          update: {
            args: Prisma.mountUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$mountPayload>
          }
          deleteMany: {
            args: Prisma.mountDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.mountUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.mountUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$mountPayload>[]
          }
          upsert: {
            args: Prisma.mountUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$mountPayload>
          }
          aggregate: {
            args: Prisma.MountAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMount>
          }
          groupBy: {
            args: Prisma.mountGroupByArgs<ExtArgs>
            result: $Utils.Optional<MountGroupByOutputType>[]
          }
          count: {
            args: Prisma.mountCountArgs<ExtArgs>
            result: $Utils.Optional<MountCountAggregateOutputType> | number
          }
        }
      }
      users: {
        payload: Prisma.$usersPayload<ExtArgs>
        fields: Prisma.usersFieldRefs
        operations: {
          findUnique: {
            args: Prisma.usersFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.usersFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>
          }
          findFirst: {
            args: Prisma.usersFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.usersFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>
          }
          findMany: {
            args: Prisma.usersFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>[]
          }
          create: {
            args: Prisma.usersCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>
          }
          createMany: {
            args: Prisma.usersCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.usersCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>[]
          }
          delete: {
            args: Prisma.usersDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>
          }
          update: {
            args: Prisma.usersUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>
          }
          deleteMany: {
            args: Prisma.usersDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.usersUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.usersUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>[]
          }
          upsert: {
            args: Prisma.usersUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>
          }
          aggregate: {
            args: Prisma.UsersAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUsers>
          }
          groupBy: {
            args: Prisma.usersGroupByArgs<ExtArgs>
            result: $Utils.Optional<UsersGroupByOutputType>[]
          }
          count: {
            args: Prisma.usersCountArgs<ExtArgs>
            result: $Utils.Optional<UsersCountAggregateOutputType> | number
          }
        }
      }
      oauth: {
        payload: Prisma.$oauthPayload<ExtArgs>
        fields: Prisma.oauthFieldRefs
        operations: {
          findUnique: {
            args: Prisma.oauthFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$oauthPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.oauthFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$oauthPayload>
          }
          findFirst: {
            args: Prisma.oauthFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$oauthPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.oauthFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$oauthPayload>
          }
          findMany: {
            args: Prisma.oauthFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$oauthPayload>[]
          }
          create: {
            args: Prisma.oauthCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$oauthPayload>
          }
          createMany: {
            args: Prisma.oauthCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.oauthCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$oauthPayload>[]
          }
          delete: {
            args: Prisma.oauthDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$oauthPayload>
          }
          update: {
            args: Prisma.oauthUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$oauthPayload>
          }
          deleteMany: {
            args: Prisma.oauthDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.oauthUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.oauthUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$oauthPayload>[]
          }
          upsert: {
            args: Prisma.oauthUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$oauthPayload>
          }
          aggregate: {
            args: Prisma.OauthAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateOauth>
          }
          groupBy: {
            args: Prisma.oauthGroupByArgs<ExtArgs>
            result: $Utils.Optional<OauthGroupByOutputType>[]
          }
          count: {
            args: Prisma.oauthCountArgs<ExtArgs>
            result: $Utils.Optional<OauthCountAggregateOutputType> | number
          }
        }
      }
      binds: {
        payload: Prisma.$bindsPayload<ExtArgs>
        fields: Prisma.bindsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.bindsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$bindsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.bindsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$bindsPayload>
          }
          findFirst: {
            args: Prisma.bindsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$bindsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.bindsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$bindsPayload>
          }
          findMany: {
            args: Prisma.bindsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$bindsPayload>[]
          }
          create: {
            args: Prisma.bindsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$bindsPayload>
          }
          createMany: {
            args: Prisma.bindsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.bindsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$bindsPayload>[]
          }
          delete: {
            args: Prisma.bindsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$bindsPayload>
          }
          update: {
            args: Prisma.bindsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$bindsPayload>
          }
          deleteMany: {
            args: Prisma.bindsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.bindsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.bindsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$bindsPayload>[]
          }
          upsert: {
            args: Prisma.bindsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$bindsPayload>
          }
          aggregate: {
            args: Prisma.BindsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateBinds>
          }
          groupBy: {
            args: Prisma.bindsGroupByArgs<ExtArgs>
            result: $Utils.Optional<BindsGroupByOutputType>[]
          }
          count: {
            args: Prisma.bindsCountArgs<ExtArgs>
            result: $Utils.Optional<BindsCountAggregateOutputType> | number
          }
        }
      }
      crypt: {
        payload: Prisma.$cryptPayload<ExtArgs>
        fields: Prisma.cryptFieldRefs
        operations: {
          findUnique: {
            args: Prisma.cryptFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cryptPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.cryptFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cryptPayload>
          }
          findFirst: {
            args: Prisma.cryptFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cryptPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.cryptFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cryptPayload>
          }
          findMany: {
            args: Prisma.cryptFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cryptPayload>[]
          }
          create: {
            args: Prisma.cryptCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cryptPayload>
          }
          createMany: {
            args: Prisma.cryptCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.cryptCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cryptPayload>[]
          }
          delete: {
            args: Prisma.cryptDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cryptPayload>
          }
          update: {
            args: Prisma.cryptUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cryptPayload>
          }
          deleteMany: {
            args: Prisma.cryptDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.cryptUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.cryptUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cryptPayload>[]
          }
          upsert: {
            args: Prisma.cryptUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cryptPayload>
          }
          aggregate: {
            args: Prisma.CryptAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCrypt>
          }
          groupBy: {
            args: Prisma.cryptGroupByArgs<ExtArgs>
            result: $Utils.Optional<CryptGroupByOutputType>[]
          }
          count: {
            args: Prisma.cryptCountArgs<ExtArgs>
            result: $Utils.Optional<CryptCountAggregateOutputType> | number
          }
        }
      }
      mates: {
        payload: Prisma.$matesPayload<ExtArgs>
        fields: Prisma.matesFieldRefs
        operations: {
          findUnique: {
            args: Prisma.matesFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$matesPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.matesFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$matesPayload>
          }
          findFirst: {
            args: Prisma.matesFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$matesPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.matesFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$matesPayload>
          }
          findMany: {
            args: Prisma.matesFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$matesPayload>[]
          }
          create: {
            args: Prisma.matesCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$matesPayload>
          }
          createMany: {
            args: Prisma.matesCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.matesCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$matesPayload>[]
          }
          delete: {
            args: Prisma.matesDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$matesPayload>
          }
          update: {
            args: Prisma.matesUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$matesPayload>
          }
          deleteMany: {
            args: Prisma.matesDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.matesUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.matesUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$matesPayload>[]
          }
          upsert: {
            args: Prisma.matesUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$matesPayload>
          }
          aggregate: {
            args: Prisma.MatesAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMates>
          }
          groupBy: {
            args: Prisma.matesGroupByArgs<ExtArgs>
            result: $Utils.Optional<MatesGroupByOutputType>[]
          }
          count: {
            args: Prisma.matesCountArgs<ExtArgs>
            result: $Utils.Optional<MatesCountAggregateOutputType> | number
          }
        }
      }
      share: {
        payload: Prisma.$sharePayload<ExtArgs>
        fields: Prisma.shareFieldRefs
        operations: {
          findUnique: {
            args: Prisma.shareFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sharePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.shareFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sharePayload>
          }
          findFirst: {
            args: Prisma.shareFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sharePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.shareFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sharePayload>
          }
          findMany: {
            args: Prisma.shareFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sharePayload>[]
          }
          create: {
            args: Prisma.shareCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sharePayload>
          }
          createMany: {
            args: Prisma.shareCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.shareCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sharePayload>[]
          }
          delete: {
            args: Prisma.shareDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sharePayload>
          }
          update: {
            args: Prisma.shareUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sharePayload>
          }
          deleteMany: {
            args: Prisma.shareDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.shareUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.shareUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sharePayload>[]
          }
          upsert: {
            args: Prisma.shareUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sharePayload>
          }
          aggregate: {
            args: Prisma.ShareAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateShare>
          }
          groupBy: {
            args: Prisma.shareGroupByArgs<ExtArgs>
            result: $Utils.Optional<ShareGroupByOutputType>[]
          }
          count: {
            args: Prisma.shareCountArgs<ExtArgs>
            result: $Utils.Optional<ShareCountAggregateOutputType> | number
          }
        }
      }
      token: {
        payload: Prisma.$tokenPayload<ExtArgs>
        fields: Prisma.tokenFieldRefs
        operations: {
          findUnique: {
            args: Prisma.tokenFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tokenPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.tokenFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tokenPayload>
          }
          findFirst: {
            args: Prisma.tokenFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tokenPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.tokenFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tokenPayload>
          }
          findMany: {
            args: Prisma.tokenFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tokenPayload>[]
          }
          create: {
            args: Prisma.tokenCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tokenPayload>
          }
          createMany: {
            args: Prisma.tokenCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.tokenCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tokenPayload>[]
          }
          delete: {
            args: Prisma.tokenDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tokenPayload>
          }
          update: {
            args: Prisma.tokenUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tokenPayload>
          }
          deleteMany: {
            args: Prisma.tokenDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.tokenUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.tokenUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tokenPayload>[]
          }
          upsert: {
            args: Prisma.tokenUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tokenPayload>
          }
          aggregate: {
            args: Prisma.TokenAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateToken>
          }
          groupBy: {
            args: Prisma.tokenGroupByArgs<ExtArgs>
            result: $Utils.Optional<TokenGroupByOutputType>[]
          }
          count: {
            args: Prisma.tokenCountArgs<ExtArgs>
            result: $Utils.Optional<TokenCountAggregateOutputType> | number
          }
        }
      }
      tasks: {
        payload: Prisma.$tasksPayload<ExtArgs>
        fields: Prisma.tasksFieldRefs
        operations: {
          findUnique: {
            args: Prisma.tasksFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tasksPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.tasksFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tasksPayload>
          }
          findFirst: {
            args: Prisma.tasksFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tasksPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.tasksFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tasksPayload>
          }
          findMany: {
            args: Prisma.tasksFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tasksPayload>[]
          }
          create: {
            args: Prisma.tasksCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tasksPayload>
          }
          createMany: {
            args: Prisma.tasksCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.tasksCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tasksPayload>[]
          }
          delete: {
            args: Prisma.tasksDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tasksPayload>
          }
          update: {
            args: Prisma.tasksUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tasksPayload>
          }
          deleteMany: {
            args: Prisma.tasksDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.tasksUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.tasksUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tasksPayload>[]
          }
          upsert: {
            args: Prisma.tasksUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tasksPayload>
          }
          aggregate: {
            args: Prisma.TasksAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTasks>
          }
          groupBy: {
            args: Prisma.tasksGroupByArgs<ExtArgs>
            result: $Utils.Optional<TasksGroupByOutputType>[]
          }
          count: {
            args: Prisma.tasksCountArgs<ExtArgs>
            result: $Utils.Optional<TasksCountAggregateOutputType> | number
          }
        }
      }
      fetch: {
        payload: Prisma.$fetchPayload<ExtArgs>
        fields: Prisma.fetchFieldRefs
        operations: {
          findUnique: {
            args: Prisma.fetchFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$fetchPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.fetchFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$fetchPayload>
          }
          findFirst: {
            args: Prisma.fetchFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$fetchPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.fetchFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$fetchPayload>
          }
          findMany: {
            args: Prisma.fetchFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$fetchPayload>[]
          }
          create: {
            args: Prisma.fetchCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$fetchPayload>
          }
          createMany: {
            args: Prisma.fetchCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.fetchCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$fetchPayload>[]
          }
          delete: {
            args: Prisma.fetchDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$fetchPayload>
          }
          update: {
            args: Prisma.fetchUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$fetchPayload>
          }
          deleteMany: {
            args: Prisma.fetchDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.fetchUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.fetchUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$fetchPayload>[]
          }
          upsert: {
            args: Prisma.fetchUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$fetchPayload>
          }
          aggregate: {
            args: Prisma.FetchAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateFetch>
          }
          groupBy: {
            args: Prisma.fetchGroupByArgs<ExtArgs>
            result: $Utils.Optional<FetchGroupByOutputType>[]
          }
          count: {
            args: Prisma.fetchCountArgs<ExtArgs>
            result: $Utils.Optional<FetchCountAggregateOutputType> | number
          }
        }
      }
      group: {
        payload: Prisma.$groupPayload<ExtArgs>
        fields: Prisma.groupFieldRefs
        operations: {
          findUnique: {
            args: Prisma.groupFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$groupPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.groupFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$groupPayload>
          }
          findFirst: {
            args: Prisma.groupFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$groupPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.groupFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$groupPayload>
          }
          findMany: {
            args: Prisma.groupFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$groupPayload>[]
          }
          create: {
            args: Prisma.groupCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$groupPayload>
          }
          createMany: {
            args: Prisma.groupCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.groupCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$groupPayload>[]
          }
          delete: {
            args: Prisma.groupDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$groupPayload>
          }
          update: {
            args: Prisma.groupUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$groupPayload>
          }
          deleteMany: {
            args: Prisma.groupDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.groupUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.groupUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$groupPayload>[]
          }
          upsert: {
            args: Prisma.groupUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$groupPayload>
          }
          aggregate: {
            args: Prisma.GroupAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateGroup>
          }
          groupBy: {
            args: Prisma.groupGroupByArgs<ExtArgs>
            result: $Utils.Optional<GroupGroupByOutputType>[]
          }
          count: {
            args: Prisma.groupCountArgs<ExtArgs>
            result: $Utils.Optional<GroupCountAggregateOutputType> | number
          }
        }
      }
      cache: {
        payload: Prisma.$cachePayload<ExtArgs>
        fields: Prisma.cacheFieldRefs
        operations: {
          findUnique: {
            args: Prisma.cacheFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cachePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.cacheFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cachePayload>
          }
          findFirst: {
            args: Prisma.cacheFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cachePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.cacheFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cachePayload>
          }
          findMany: {
            args: Prisma.cacheFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cachePayload>[]
          }
          create: {
            args: Prisma.cacheCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cachePayload>
          }
          createMany: {
            args: Prisma.cacheCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.cacheCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cachePayload>[]
          }
          delete: {
            args: Prisma.cacheDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cachePayload>
          }
          update: {
            args: Prisma.cacheUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cachePayload>
          }
          deleteMany: {
            args: Prisma.cacheDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.cacheUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.cacheUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cachePayload>[]
          }
          upsert: {
            args: Prisma.cacheUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cachePayload>
          }
          aggregate: {
            args: Prisma.CacheAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCache>
          }
          groupBy: {
            args: Prisma.cacheGroupByArgs<ExtArgs>
            result: $Utils.Optional<CacheGroupByOutputType>[]
          }
          count: {
            args: Prisma.cacheCountArgs<ExtArgs>
            result: $Utils.Optional<CacheCountAggregateOutputType> | number
          }
        }
      }
      admin: {
        payload: Prisma.$adminPayload<ExtArgs>
        fields: Prisma.adminFieldRefs
        operations: {
          findUnique: {
            args: Prisma.adminFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$adminPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.adminFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$adminPayload>
          }
          findFirst: {
            args: Prisma.adminFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$adminPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.adminFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$adminPayload>
          }
          findMany: {
            args: Prisma.adminFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$adminPayload>[]
          }
          create: {
            args: Prisma.adminCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$adminPayload>
          }
          createMany: {
            args: Prisma.adminCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.adminCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$adminPayload>[]
          }
          delete: {
            args: Prisma.adminDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$adminPayload>
          }
          update: {
            args: Prisma.adminUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$adminPayload>
          }
          deleteMany: {
            args: Prisma.adminDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.adminUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.adminUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$adminPayload>[]
          }
          upsert: {
            args: Prisma.adminUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$adminPayload>
          }
          aggregate: {
            args: Prisma.AdminAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAdmin>
          }
          groupBy: {
            args: Prisma.adminGroupByArgs<ExtArgs>
            result: $Utils.Optional<AdminGroupByOutputType>[]
          }
          count: {
            args: Prisma.adminCountArgs<ExtArgs>
            result: $Utils.Optional<AdminCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory
    /**
     * Prisma Accelerate URL allowing the client to connect through Accelerate instead of a direct database.
     */
    accelerateUrl?: string
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    mount?: mountOmit
    users?: usersOmit
    oauth?: oauthOmit
    binds?: bindsOmit
    crypt?: cryptOmit
    mates?: matesOmit
    share?: shareOmit
    token?: tokenOmit
    tasks?: tasksOmit
    fetch?: fetchOmit
    group?: groupOmit
    cache?: cacheOmit
    admin?: adminOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */



  /**
   * Models
   */

  /**
   * Model mount
   */

  export type AggregateMount = {
    _count: MountCountAggregateOutputType | null
    _avg: MountAvgAggregateOutputType | null
    _sum: MountSumAggregateOutputType | null
    _min: MountMinAggregateOutputType | null
    _max: MountMaxAggregateOutputType | null
  }

  export type MountAvgAggregateOutputType = {
    is_enabled: number | null
    cache_time: number | null
    index_list: number | null
    proxy_mode: number | null
  }

  export type MountSumAggregateOutputType = {
    is_enabled: number | null
    cache_time: number | null
    index_list: number | null
    proxy_mode: number | null
  }

  export type MountMinAggregateOutputType = {
    mount_path: string | null
    mount_type: string | null
    is_enabled: number | null
    drive_conf: string | null
    drive_save: string | null
    cache_time: number | null
    index_list: number | null
    proxy_mode: number | null
    proxy_data: string | null
    drive_logs: string | null
    drive_tips: string | null
  }

  export type MountMaxAggregateOutputType = {
    mount_path: string | null
    mount_type: string | null
    is_enabled: number | null
    drive_conf: string | null
    drive_save: string | null
    cache_time: number | null
    index_list: number | null
    proxy_mode: number | null
    proxy_data: string | null
    drive_logs: string | null
    drive_tips: string | null
  }

  export type MountCountAggregateOutputType = {
    mount_path: number
    mount_type: number
    is_enabled: number
    drive_conf: number
    drive_save: number
    cache_time: number
    index_list: number
    proxy_mode: number
    proxy_data: number
    drive_logs: number
    drive_tips: number
    _all: number
  }


  export type MountAvgAggregateInputType = {
    is_enabled?: true
    cache_time?: true
    index_list?: true
    proxy_mode?: true
  }

  export type MountSumAggregateInputType = {
    is_enabled?: true
    cache_time?: true
    index_list?: true
    proxy_mode?: true
  }

  export type MountMinAggregateInputType = {
    mount_path?: true
    mount_type?: true
    is_enabled?: true
    drive_conf?: true
    drive_save?: true
    cache_time?: true
    index_list?: true
    proxy_mode?: true
    proxy_data?: true
    drive_logs?: true
    drive_tips?: true
  }

  export type MountMaxAggregateInputType = {
    mount_path?: true
    mount_type?: true
    is_enabled?: true
    drive_conf?: true
    drive_save?: true
    cache_time?: true
    index_list?: true
    proxy_mode?: true
    proxy_data?: true
    drive_logs?: true
    drive_tips?: true
  }

  export type MountCountAggregateInputType = {
    mount_path?: true
    mount_type?: true
    is_enabled?: true
    drive_conf?: true
    drive_save?: true
    cache_time?: true
    index_list?: true
    proxy_mode?: true
    proxy_data?: true
    drive_logs?: true
    drive_tips?: true
    _all?: true
  }

  export type MountAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which mount to aggregate.
     */
    where?: mountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of mounts to fetch.
     */
    orderBy?: mountOrderByWithRelationInput | mountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: mountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` mounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` mounts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned mounts
    **/
    _count?: true | MountCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: MountAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: MountSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MountMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MountMaxAggregateInputType
  }

  export type GetMountAggregateType<T extends MountAggregateArgs> = {
        [P in keyof T & keyof AggregateMount]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMount[P]>
      : GetScalarType<T[P], AggregateMount[P]>
  }




  export type mountGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: mountWhereInput
    orderBy?: mountOrderByWithAggregationInput | mountOrderByWithAggregationInput[]
    by: MountScalarFieldEnum[] | MountScalarFieldEnum
    having?: mountScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MountCountAggregateInputType | true
    _avg?: MountAvgAggregateInputType
    _sum?: MountSumAggregateInputType
    _min?: MountMinAggregateInputType
    _max?: MountMaxAggregateInputType
  }

  export type MountGroupByOutputType = {
    mount_path: string
    mount_type: string
    is_enabled: number
    drive_conf: string | null
    drive_save: string | null
    cache_time: number | null
    index_list: number | null
    proxy_mode: number | null
    proxy_data: string | null
    drive_logs: string | null
    drive_tips: string | null
    _count: MountCountAggregateOutputType | null
    _avg: MountAvgAggregateOutputType | null
    _sum: MountSumAggregateOutputType | null
    _min: MountMinAggregateOutputType | null
    _max: MountMaxAggregateOutputType | null
  }

  type GetMountGroupByPayload<T extends mountGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MountGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MountGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MountGroupByOutputType[P]>
            : GetScalarType<T[P], MountGroupByOutputType[P]>
        }
      >
    >


  export type mountSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    mount_path?: boolean
    mount_type?: boolean
    is_enabled?: boolean
    drive_conf?: boolean
    drive_save?: boolean
    cache_time?: boolean
    index_list?: boolean
    proxy_mode?: boolean
    proxy_data?: boolean
    drive_logs?: boolean
    drive_tips?: boolean
  }, ExtArgs["result"]["mount"]>

  export type mountSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    mount_path?: boolean
    mount_type?: boolean
    is_enabled?: boolean
    drive_conf?: boolean
    drive_save?: boolean
    cache_time?: boolean
    index_list?: boolean
    proxy_mode?: boolean
    proxy_data?: boolean
    drive_logs?: boolean
    drive_tips?: boolean
  }, ExtArgs["result"]["mount"]>

  export type mountSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    mount_path?: boolean
    mount_type?: boolean
    is_enabled?: boolean
    drive_conf?: boolean
    drive_save?: boolean
    cache_time?: boolean
    index_list?: boolean
    proxy_mode?: boolean
    proxy_data?: boolean
    drive_logs?: boolean
    drive_tips?: boolean
  }, ExtArgs["result"]["mount"]>

  export type mountSelectScalar = {
    mount_path?: boolean
    mount_type?: boolean
    is_enabled?: boolean
    drive_conf?: boolean
    drive_save?: boolean
    cache_time?: boolean
    index_list?: boolean
    proxy_mode?: boolean
    proxy_data?: boolean
    drive_logs?: boolean
    drive_tips?: boolean
  }

  export type mountOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"mount_path" | "mount_type" | "is_enabled" | "drive_conf" | "drive_save" | "cache_time" | "index_list" | "proxy_mode" | "proxy_data" | "drive_logs" | "drive_tips", ExtArgs["result"]["mount"]>

  export type $mountPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "mount"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      mount_path: string
      mount_type: string
      is_enabled: number
      drive_conf: string | null
      drive_save: string | null
      cache_time: number | null
      index_list: number | null
      proxy_mode: number | null
      proxy_data: string | null
      drive_logs: string | null
      drive_tips: string | null
    }, ExtArgs["result"]["mount"]>
    composites: {}
  }

  type mountGetPayload<S extends boolean | null | undefined | mountDefaultArgs> = $Result.GetResult<Prisma.$mountPayload, S>

  type mountCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<mountFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: MountCountAggregateInputType | true
    }

  export interface mountDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['mount'], meta: { name: 'mount' } }
    /**
     * Find zero or one Mount that matches the filter.
     * @param {mountFindUniqueArgs} args - Arguments to find a Mount
     * @example
     * // Get one Mount
     * const mount = await prisma.mount.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends mountFindUniqueArgs>(args: SelectSubset<T, mountFindUniqueArgs<ExtArgs>>): Prisma__mountClient<$Result.GetResult<Prisma.$mountPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Mount that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {mountFindUniqueOrThrowArgs} args - Arguments to find a Mount
     * @example
     * // Get one Mount
     * const mount = await prisma.mount.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends mountFindUniqueOrThrowArgs>(args: SelectSubset<T, mountFindUniqueOrThrowArgs<ExtArgs>>): Prisma__mountClient<$Result.GetResult<Prisma.$mountPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Mount that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {mountFindFirstArgs} args - Arguments to find a Mount
     * @example
     * // Get one Mount
     * const mount = await prisma.mount.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends mountFindFirstArgs>(args?: SelectSubset<T, mountFindFirstArgs<ExtArgs>>): Prisma__mountClient<$Result.GetResult<Prisma.$mountPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Mount that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {mountFindFirstOrThrowArgs} args - Arguments to find a Mount
     * @example
     * // Get one Mount
     * const mount = await prisma.mount.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends mountFindFirstOrThrowArgs>(args?: SelectSubset<T, mountFindFirstOrThrowArgs<ExtArgs>>): Prisma__mountClient<$Result.GetResult<Prisma.$mountPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Mounts that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {mountFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Mounts
     * const mounts = await prisma.mount.findMany()
     * 
     * // Get first 10 Mounts
     * const mounts = await prisma.mount.findMany({ take: 10 })
     * 
     * // Only select the `mount_path`
     * const mountWithMount_pathOnly = await prisma.mount.findMany({ select: { mount_path: true } })
     * 
     */
    findMany<T extends mountFindManyArgs>(args?: SelectSubset<T, mountFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$mountPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Mount.
     * @param {mountCreateArgs} args - Arguments to create a Mount.
     * @example
     * // Create one Mount
     * const Mount = await prisma.mount.create({
     *   data: {
     *     // ... data to create a Mount
     *   }
     * })
     * 
     */
    create<T extends mountCreateArgs>(args: SelectSubset<T, mountCreateArgs<ExtArgs>>): Prisma__mountClient<$Result.GetResult<Prisma.$mountPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Mounts.
     * @param {mountCreateManyArgs} args - Arguments to create many Mounts.
     * @example
     * // Create many Mounts
     * const mount = await prisma.mount.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends mountCreateManyArgs>(args?: SelectSubset<T, mountCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Mounts and returns the data saved in the database.
     * @param {mountCreateManyAndReturnArgs} args - Arguments to create many Mounts.
     * @example
     * // Create many Mounts
     * const mount = await prisma.mount.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Mounts and only return the `mount_path`
     * const mountWithMount_pathOnly = await prisma.mount.createManyAndReturn({
     *   select: { mount_path: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends mountCreateManyAndReturnArgs>(args?: SelectSubset<T, mountCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$mountPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Mount.
     * @param {mountDeleteArgs} args - Arguments to delete one Mount.
     * @example
     * // Delete one Mount
     * const Mount = await prisma.mount.delete({
     *   where: {
     *     // ... filter to delete one Mount
     *   }
     * })
     * 
     */
    delete<T extends mountDeleteArgs>(args: SelectSubset<T, mountDeleteArgs<ExtArgs>>): Prisma__mountClient<$Result.GetResult<Prisma.$mountPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Mount.
     * @param {mountUpdateArgs} args - Arguments to update one Mount.
     * @example
     * // Update one Mount
     * const mount = await prisma.mount.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends mountUpdateArgs>(args: SelectSubset<T, mountUpdateArgs<ExtArgs>>): Prisma__mountClient<$Result.GetResult<Prisma.$mountPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Mounts.
     * @param {mountDeleteManyArgs} args - Arguments to filter Mounts to delete.
     * @example
     * // Delete a few Mounts
     * const { count } = await prisma.mount.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends mountDeleteManyArgs>(args?: SelectSubset<T, mountDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Mounts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {mountUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Mounts
     * const mount = await prisma.mount.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends mountUpdateManyArgs>(args: SelectSubset<T, mountUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Mounts and returns the data updated in the database.
     * @param {mountUpdateManyAndReturnArgs} args - Arguments to update many Mounts.
     * @example
     * // Update many Mounts
     * const mount = await prisma.mount.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Mounts and only return the `mount_path`
     * const mountWithMount_pathOnly = await prisma.mount.updateManyAndReturn({
     *   select: { mount_path: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends mountUpdateManyAndReturnArgs>(args: SelectSubset<T, mountUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$mountPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Mount.
     * @param {mountUpsertArgs} args - Arguments to update or create a Mount.
     * @example
     * // Update or create a Mount
     * const mount = await prisma.mount.upsert({
     *   create: {
     *     // ... data to create a Mount
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Mount we want to update
     *   }
     * })
     */
    upsert<T extends mountUpsertArgs>(args: SelectSubset<T, mountUpsertArgs<ExtArgs>>): Prisma__mountClient<$Result.GetResult<Prisma.$mountPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Mounts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {mountCountArgs} args - Arguments to filter Mounts to count.
     * @example
     * // Count the number of Mounts
     * const count = await prisma.mount.count({
     *   where: {
     *     // ... the filter for the Mounts we want to count
     *   }
     * })
    **/
    count<T extends mountCountArgs>(
      args?: Subset<T, mountCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MountCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Mount.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MountAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends MountAggregateArgs>(args: Subset<T, MountAggregateArgs>): Prisma.PrismaPromise<GetMountAggregateType<T>>

    /**
     * Group by Mount.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {mountGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends mountGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: mountGroupByArgs['orderBy'] }
        : { orderBy?: mountGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, mountGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMountGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the mount model
   */
  readonly fields: mountFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for mount.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__mountClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the mount model
   */
  interface mountFieldRefs {
    readonly mount_path: FieldRef<"mount", 'String'>
    readonly mount_type: FieldRef<"mount", 'String'>
    readonly is_enabled: FieldRef<"mount", 'Int'>
    readonly drive_conf: FieldRef<"mount", 'String'>
    readonly drive_save: FieldRef<"mount", 'String'>
    readonly cache_time: FieldRef<"mount", 'Int'>
    readonly index_list: FieldRef<"mount", 'Int'>
    readonly proxy_mode: FieldRef<"mount", 'Int'>
    readonly proxy_data: FieldRef<"mount", 'String'>
    readonly drive_logs: FieldRef<"mount", 'String'>
    readonly drive_tips: FieldRef<"mount", 'String'>
  }
    

  // Custom InputTypes
  /**
   * mount findUnique
   */
  export type mountFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the mount
     */
    select?: mountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the mount
     */
    omit?: mountOmit<ExtArgs> | null
    /**
     * Filter, which mount to fetch.
     */
    where: mountWhereUniqueInput
  }

  /**
   * mount findUniqueOrThrow
   */
  export type mountFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the mount
     */
    select?: mountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the mount
     */
    omit?: mountOmit<ExtArgs> | null
    /**
     * Filter, which mount to fetch.
     */
    where: mountWhereUniqueInput
  }

  /**
   * mount findFirst
   */
  export type mountFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the mount
     */
    select?: mountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the mount
     */
    omit?: mountOmit<ExtArgs> | null
    /**
     * Filter, which mount to fetch.
     */
    where?: mountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of mounts to fetch.
     */
    orderBy?: mountOrderByWithRelationInput | mountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for mounts.
     */
    cursor?: mountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` mounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` mounts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of mounts.
     */
    distinct?: MountScalarFieldEnum | MountScalarFieldEnum[]
  }

  /**
   * mount findFirstOrThrow
   */
  export type mountFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the mount
     */
    select?: mountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the mount
     */
    omit?: mountOmit<ExtArgs> | null
    /**
     * Filter, which mount to fetch.
     */
    where?: mountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of mounts to fetch.
     */
    orderBy?: mountOrderByWithRelationInput | mountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for mounts.
     */
    cursor?: mountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` mounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` mounts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of mounts.
     */
    distinct?: MountScalarFieldEnum | MountScalarFieldEnum[]
  }

  /**
   * mount findMany
   */
  export type mountFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the mount
     */
    select?: mountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the mount
     */
    omit?: mountOmit<ExtArgs> | null
    /**
     * Filter, which mounts to fetch.
     */
    where?: mountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of mounts to fetch.
     */
    orderBy?: mountOrderByWithRelationInput | mountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing mounts.
     */
    cursor?: mountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` mounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` mounts.
     */
    skip?: number
    distinct?: MountScalarFieldEnum | MountScalarFieldEnum[]
  }

  /**
   * mount create
   */
  export type mountCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the mount
     */
    select?: mountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the mount
     */
    omit?: mountOmit<ExtArgs> | null
    /**
     * The data needed to create a mount.
     */
    data: XOR<mountCreateInput, mountUncheckedCreateInput>
  }

  /**
   * mount createMany
   */
  export type mountCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many mounts.
     */
    data: mountCreateManyInput | mountCreateManyInput[]
  }

  /**
   * mount createManyAndReturn
   */
  export type mountCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the mount
     */
    select?: mountSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the mount
     */
    omit?: mountOmit<ExtArgs> | null
    /**
     * The data used to create many mounts.
     */
    data: mountCreateManyInput | mountCreateManyInput[]
  }

  /**
   * mount update
   */
  export type mountUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the mount
     */
    select?: mountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the mount
     */
    omit?: mountOmit<ExtArgs> | null
    /**
     * The data needed to update a mount.
     */
    data: XOR<mountUpdateInput, mountUncheckedUpdateInput>
    /**
     * Choose, which mount to update.
     */
    where: mountWhereUniqueInput
  }

  /**
   * mount updateMany
   */
  export type mountUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update mounts.
     */
    data: XOR<mountUpdateManyMutationInput, mountUncheckedUpdateManyInput>
    /**
     * Filter which mounts to update
     */
    where?: mountWhereInput
    /**
     * Limit how many mounts to update.
     */
    limit?: number
  }

  /**
   * mount updateManyAndReturn
   */
  export type mountUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the mount
     */
    select?: mountSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the mount
     */
    omit?: mountOmit<ExtArgs> | null
    /**
     * The data used to update mounts.
     */
    data: XOR<mountUpdateManyMutationInput, mountUncheckedUpdateManyInput>
    /**
     * Filter which mounts to update
     */
    where?: mountWhereInput
    /**
     * Limit how many mounts to update.
     */
    limit?: number
  }

  /**
   * mount upsert
   */
  export type mountUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the mount
     */
    select?: mountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the mount
     */
    omit?: mountOmit<ExtArgs> | null
    /**
     * The filter to search for the mount to update in case it exists.
     */
    where: mountWhereUniqueInput
    /**
     * In case the mount found by the `where` argument doesn't exist, create a new mount with this data.
     */
    create: XOR<mountCreateInput, mountUncheckedCreateInput>
    /**
     * In case the mount was found with the provided `where` argument, update it with this data.
     */
    update: XOR<mountUpdateInput, mountUncheckedUpdateInput>
  }

  /**
   * mount delete
   */
  export type mountDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the mount
     */
    select?: mountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the mount
     */
    omit?: mountOmit<ExtArgs> | null
    /**
     * Filter which mount to delete.
     */
    where: mountWhereUniqueInput
  }

  /**
   * mount deleteMany
   */
  export type mountDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which mounts to delete
     */
    where?: mountWhereInput
    /**
     * Limit how many mounts to delete.
     */
    limit?: number
  }

  /**
   * mount without action
   */
  export type mountDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the mount
     */
    select?: mountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the mount
     */
    omit?: mountOmit<ExtArgs> | null
  }


  /**
   * Model users
   */

  export type AggregateUsers = {
    _count: UsersCountAggregateOutputType | null
    _avg: UsersAvgAggregateOutputType | null
    _sum: UsersSumAggregateOutputType | null
    _min: UsersMinAggregateOutputType | null
    _max: UsersMaxAggregateOutputType | null
  }

  export type UsersAvgAggregateOutputType = {
    is_enabled: number | null
    total_size: number | null
    total_used: number | null
  }

  export type UsersSumAggregateOutputType = {
    is_enabled: number | null
    total_size: number | null
    total_used: number | null
  }

  export type UsersMinAggregateOutputType = {
    users_name: string | null
    users_mail: string | null
    users_pass: string | null
    users_mask: string | null
    is_enabled: number | null
    total_size: number | null
    total_used: number | null
    oauth_data: string | null
    mount_data: string | null
  }

  export type UsersMaxAggregateOutputType = {
    users_name: string | null
    users_mail: string | null
    users_pass: string | null
    users_mask: string | null
    is_enabled: number | null
    total_size: number | null
    total_used: number | null
    oauth_data: string | null
    mount_data: string | null
  }

  export type UsersCountAggregateOutputType = {
    users_name: number
    users_mail: number
    users_pass: number
    users_mask: number
    is_enabled: number
    total_size: number
    total_used: number
    oauth_data: number
    mount_data: number
    _all: number
  }


  export type UsersAvgAggregateInputType = {
    is_enabled?: true
    total_size?: true
    total_used?: true
  }

  export type UsersSumAggregateInputType = {
    is_enabled?: true
    total_size?: true
    total_used?: true
  }

  export type UsersMinAggregateInputType = {
    users_name?: true
    users_mail?: true
    users_pass?: true
    users_mask?: true
    is_enabled?: true
    total_size?: true
    total_used?: true
    oauth_data?: true
    mount_data?: true
  }

  export type UsersMaxAggregateInputType = {
    users_name?: true
    users_mail?: true
    users_pass?: true
    users_mask?: true
    is_enabled?: true
    total_size?: true
    total_used?: true
    oauth_data?: true
    mount_data?: true
  }

  export type UsersCountAggregateInputType = {
    users_name?: true
    users_mail?: true
    users_pass?: true
    users_mask?: true
    is_enabled?: true
    total_size?: true
    total_used?: true
    oauth_data?: true
    mount_data?: true
    _all?: true
  }

  export type UsersAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which users to aggregate.
     */
    where?: usersWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of users to fetch.
     */
    orderBy?: usersOrderByWithRelationInput | usersOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: usersWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned users
    **/
    _count?: true | UsersCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: UsersAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: UsersSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UsersMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UsersMaxAggregateInputType
  }

  export type GetUsersAggregateType<T extends UsersAggregateArgs> = {
        [P in keyof T & keyof AggregateUsers]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUsers[P]>
      : GetScalarType<T[P], AggregateUsers[P]>
  }




  export type usersGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: usersWhereInput
    orderBy?: usersOrderByWithAggregationInput | usersOrderByWithAggregationInput[]
    by: UsersScalarFieldEnum[] | UsersScalarFieldEnum
    having?: usersScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UsersCountAggregateInputType | true
    _avg?: UsersAvgAggregateInputType
    _sum?: UsersSumAggregateInputType
    _min?: UsersMinAggregateInputType
    _max?: UsersMaxAggregateInputType
  }

  export type UsersGroupByOutputType = {
    users_name: string
    users_mail: string
    users_pass: string
    users_mask: string
    is_enabled: number
    total_size: number | null
    total_used: number | null
    oauth_data: string | null
    mount_data: string | null
    _count: UsersCountAggregateOutputType | null
    _avg: UsersAvgAggregateOutputType | null
    _sum: UsersSumAggregateOutputType | null
    _min: UsersMinAggregateOutputType | null
    _max: UsersMaxAggregateOutputType | null
  }

  type GetUsersGroupByPayload<T extends usersGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UsersGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UsersGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UsersGroupByOutputType[P]>
            : GetScalarType<T[P], UsersGroupByOutputType[P]>
        }
      >
    >


  export type usersSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    users_name?: boolean
    users_mail?: boolean
    users_pass?: boolean
    users_mask?: boolean
    is_enabled?: boolean
    total_size?: boolean
    total_used?: boolean
    oauth_data?: boolean
    mount_data?: boolean
  }, ExtArgs["result"]["users"]>

  export type usersSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    users_name?: boolean
    users_mail?: boolean
    users_pass?: boolean
    users_mask?: boolean
    is_enabled?: boolean
    total_size?: boolean
    total_used?: boolean
    oauth_data?: boolean
    mount_data?: boolean
  }, ExtArgs["result"]["users"]>

  export type usersSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    users_name?: boolean
    users_mail?: boolean
    users_pass?: boolean
    users_mask?: boolean
    is_enabled?: boolean
    total_size?: boolean
    total_used?: boolean
    oauth_data?: boolean
    mount_data?: boolean
  }, ExtArgs["result"]["users"]>

  export type usersSelectScalar = {
    users_name?: boolean
    users_mail?: boolean
    users_pass?: boolean
    users_mask?: boolean
    is_enabled?: boolean
    total_size?: boolean
    total_used?: boolean
    oauth_data?: boolean
    mount_data?: boolean
  }

  export type usersOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"users_name" | "users_mail" | "users_pass" | "users_mask" | "is_enabled" | "total_size" | "total_used" | "oauth_data" | "mount_data", ExtArgs["result"]["users"]>

  export type $usersPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "users"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      users_name: string
      users_mail: string
      users_pass: string
      users_mask: string
      is_enabled: number
      total_size: number | null
      total_used: number | null
      oauth_data: string | null
      mount_data: string | null
    }, ExtArgs["result"]["users"]>
    composites: {}
  }

  type usersGetPayload<S extends boolean | null | undefined | usersDefaultArgs> = $Result.GetResult<Prisma.$usersPayload, S>

  type usersCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<usersFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UsersCountAggregateInputType | true
    }

  export interface usersDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['users'], meta: { name: 'users' } }
    /**
     * Find zero or one Users that matches the filter.
     * @param {usersFindUniqueArgs} args - Arguments to find a Users
     * @example
     * // Get one Users
     * const users = await prisma.users.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends usersFindUniqueArgs>(args: SelectSubset<T, usersFindUniqueArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Users that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {usersFindUniqueOrThrowArgs} args - Arguments to find a Users
     * @example
     * // Get one Users
     * const users = await prisma.users.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends usersFindUniqueOrThrowArgs>(args: SelectSubset<T, usersFindUniqueOrThrowArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {usersFindFirstArgs} args - Arguments to find a Users
     * @example
     * // Get one Users
     * const users = await prisma.users.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends usersFindFirstArgs>(args?: SelectSubset<T, usersFindFirstArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Users that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {usersFindFirstOrThrowArgs} args - Arguments to find a Users
     * @example
     * // Get one Users
     * const users = await prisma.users.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends usersFindFirstOrThrowArgs>(args?: SelectSubset<T, usersFindFirstOrThrowArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {usersFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.users.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.users.findMany({ take: 10 })
     * 
     * // Only select the `users_name`
     * const usersWithUsers_nameOnly = await prisma.users.findMany({ select: { users_name: true } })
     * 
     */
    findMany<T extends usersFindManyArgs>(args?: SelectSubset<T, usersFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Users.
     * @param {usersCreateArgs} args - Arguments to create a Users.
     * @example
     * // Create one Users
     * const Users = await prisma.users.create({
     *   data: {
     *     // ... data to create a Users
     *   }
     * })
     * 
     */
    create<T extends usersCreateArgs>(args: SelectSubset<T, usersCreateArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {usersCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const users = await prisma.users.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends usersCreateManyArgs>(args?: SelectSubset<T, usersCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {usersCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const users = await prisma.users.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `users_name`
     * const usersWithUsers_nameOnly = await prisma.users.createManyAndReturn({
     *   select: { users_name: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends usersCreateManyAndReturnArgs>(args?: SelectSubset<T, usersCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Users.
     * @param {usersDeleteArgs} args - Arguments to delete one Users.
     * @example
     * // Delete one Users
     * const Users = await prisma.users.delete({
     *   where: {
     *     // ... filter to delete one Users
     *   }
     * })
     * 
     */
    delete<T extends usersDeleteArgs>(args: SelectSubset<T, usersDeleteArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Users.
     * @param {usersUpdateArgs} args - Arguments to update one Users.
     * @example
     * // Update one Users
     * const users = await prisma.users.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends usersUpdateArgs>(args: SelectSubset<T, usersUpdateArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {usersDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.users.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends usersDeleteManyArgs>(args?: SelectSubset<T, usersDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {usersUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const users = await prisma.users.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends usersUpdateManyArgs>(args: SelectSubset<T, usersUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {usersUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const users = await prisma.users.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `users_name`
     * const usersWithUsers_nameOnly = await prisma.users.updateManyAndReturn({
     *   select: { users_name: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends usersUpdateManyAndReturnArgs>(args: SelectSubset<T, usersUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Users.
     * @param {usersUpsertArgs} args - Arguments to update or create a Users.
     * @example
     * // Update or create a Users
     * const users = await prisma.users.upsert({
     *   create: {
     *     // ... data to create a Users
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Users we want to update
     *   }
     * })
     */
    upsert<T extends usersUpsertArgs>(args: SelectSubset<T, usersUpsertArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {usersCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.users.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends usersCountArgs>(
      args?: Subset<T, usersCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UsersCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsersAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UsersAggregateArgs>(args: Subset<T, UsersAggregateArgs>): Prisma.PrismaPromise<GetUsersAggregateType<T>>

    /**
     * Group by Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {usersGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends usersGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: usersGroupByArgs['orderBy'] }
        : { orderBy?: usersGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, usersGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUsersGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the users model
   */
  readonly fields: usersFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for users.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__usersClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the users model
   */
  interface usersFieldRefs {
    readonly users_name: FieldRef<"users", 'String'>
    readonly users_mail: FieldRef<"users", 'String'>
    readonly users_pass: FieldRef<"users", 'String'>
    readonly users_mask: FieldRef<"users", 'String'>
    readonly is_enabled: FieldRef<"users", 'Int'>
    readonly total_size: FieldRef<"users", 'Int'>
    readonly total_used: FieldRef<"users", 'Int'>
    readonly oauth_data: FieldRef<"users", 'String'>
    readonly mount_data: FieldRef<"users", 'String'>
  }
    

  // Custom InputTypes
  /**
   * users findUnique
   */
  export type usersFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the users
     */
    omit?: usersOmit<ExtArgs> | null
    /**
     * Filter, which users to fetch.
     */
    where: usersWhereUniqueInput
  }

  /**
   * users findUniqueOrThrow
   */
  export type usersFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the users
     */
    omit?: usersOmit<ExtArgs> | null
    /**
     * Filter, which users to fetch.
     */
    where: usersWhereUniqueInput
  }

  /**
   * users findFirst
   */
  export type usersFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the users
     */
    omit?: usersOmit<ExtArgs> | null
    /**
     * Filter, which users to fetch.
     */
    where?: usersWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of users to fetch.
     */
    orderBy?: usersOrderByWithRelationInput | usersOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for users.
     */
    cursor?: usersWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of users.
     */
    distinct?: UsersScalarFieldEnum | UsersScalarFieldEnum[]
  }

  /**
   * users findFirstOrThrow
   */
  export type usersFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the users
     */
    omit?: usersOmit<ExtArgs> | null
    /**
     * Filter, which users to fetch.
     */
    where?: usersWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of users to fetch.
     */
    orderBy?: usersOrderByWithRelationInput | usersOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for users.
     */
    cursor?: usersWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of users.
     */
    distinct?: UsersScalarFieldEnum | UsersScalarFieldEnum[]
  }

  /**
   * users findMany
   */
  export type usersFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the users
     */
    omit?: usersOmit<ExtArgs> | null
    /**
     * Filter, which users to fetch.
     */
    where?: usersWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of users to fetch.
     */
    orderBy?: usersOrderByWithRelationInput | usersOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing users.
     */
    cursor?: usersWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` users.
     */
    skip?: number
    distinct?: UsersScalarFieldEnum | UsersScalarFieldEnum[]
  }

  /**
   * users create
   */
  export type usersCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the users
     */
    omit?: usersOmit<ExtArgs> | null
    /**
     * The data needed to create a users.
     */
    data: XOR<usersCreateInput, usersUncheckedCreateInput>
  }

  /**
   * users createMany
   */
  export type usersCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many users.
     */
    data: usersCreateManyInput | usersCreateManyInput[]
  }

  /**
   * users createManyAndReturn
   */
  export type usersCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the users
     */
    omit?: usersOmit<ExtArgs> | null
    /**
     * The data used to create many users.
     */
    data: usersCreateManyInput | usersCreateManyInput[]
  }

  /**
   * users update
   */
  export type usersUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the users
     */
    omit?: usersOmit<ExtArgs> | null
    /**
     * The data needed to update a users.
     */
    data: XOR<usersUpdateInput, usersUncheckedUpdateInput>
    /**
     * Choose, which users to update.
     */
    where: usersWhereUniqueInput
  }

  /**
   * users updateMany
   */
  export type usersUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update users.
     */
    data: XOR<usersUpdateManyMutationInput, usersUncheckedUpdateManyInput>
    /**
     * Filter which users to update
     */
    where?: usersWhereInput
    /**
     * Limit how many users to update.
     */
    limit?: number
  }

  /**
   * users updateManyAndReturn
   */
  export type usersUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the users
     */
    omit?: usersOmit<ExtArgs> | null
    /**
     * The data used to update users.
     */
    data: XOR<usersUpdateManyMutationInput, usersUncheckedUpdateManyInput>
    /**
     * Filter which users to update
     */
    where?: usersWhereInput
    /**
     * Limit how many users to update.
     */
    limit?: number
  }

  /**
   * users upsert
   */
  export type usersUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the users
     */
    omit?: usersOmit<ExtArgs> | null
    /**
     * The filter to search for the users to update in case it exists.
     */
    where: usersWhereUniqueInput
    /**
     * In case the users found by the `where` argument doesn't exist, create a new users with this data.
     */
    create: XOR<usersCreateInput, usersUncheckedCreateInput>
    /**
     * In case the users was found with the provided `where` argument, update it with this data.
     */
    update: XOR<usersUpdateInput, usersUncheckedUpdateInput>
  }

  /**
   * users delete
   */
  export type usersDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the users
     */
    omit?: usersOmit<ExtArgs> | null
    /**
     * Filter which users to delete.
     */
    where: usersWhereUniqueInput
  }

  /**
   * users deleteMany
   */
  export type usersDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which users to delete
     */
    where?: usersWhereInput
    /**
     * Limit how many users to delete.
     */
    limit?: number
  }

  /**
   * users without action
   */
  export type usersDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the users
     */
    omit?: usersOmit<ExtArgs> | null
  }


  /**
   * Model oauth
   */

  export type AggregateOauth = {
    _count: OauthCountAggregateOutputType | null
    _avg: OauthAvgAggregateOutputType | null
    _sum: OauthSumAggregateOutputType | null
    _min: OauthMinAggregateOutputType | null
    _max: OauthMaxAggregateOutputType | null
  }

  export type OauthAvgAggregateOutputType = {
    is_enabled: number | null
  }

  export type OauthSumAggregateOutputType = {
    is_enabled: number | null
  }

  export type OauthMinAggregateOutputType = {
    oauth_name: string | null
    oauth_type: string | null
    oauth_data: string | null
    is_enabled: number | null
  }

  export type OauthMaxAggregateOutputType = {
    oauth_name: string | null
    oauth_type: string | null
    oauth_data: string | null
    is_enabled: number | null
  }

  export type OauthCountAggregateOutputType = {
    oauth_name: number
    oauth_type: number
    oauth_data: number
    is_enabled: number
    _all: number
  }


  export type OauthAvgAggregateInputType = {
    is_enabled?: true
  }

  export type OauthSumAggregateInputType = {
    is_enabled?: true
  }

  export type OauthMinAggregateInputType = {
    oauth_name?: true
    oauth_type?: true
    oauth_data?: true
    is_enabled?: true
  }

  export type OauthMaxAggregateInputType = {
    oauth_name?: true
    oauth_type?: true
    oauth_data?: true
    is_enabled?: true
  }

  export type OauthCountAggregateInputType = {
    oauth_name?: true
    oauth_type?: true
    oauth_data?: true
    is_enabled?: true
    _all?: true
  }

  export type OauthAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which oauth to aggregate.
     */
    where?: oauthWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of oauths to fetch.
     */
    orderBy?: oauthOrderByWithRelationInput | oauthOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: oauthWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` oauths from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` oauths.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned oauths
    **/
    _count?: true | OauthCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: OauthAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: OauthSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: OauthMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: OauthMaxAggregateInputType
  }

  export type GetOauthAggregateType<T extends OauthAggregateArgs> = {
        [P in keyof T & keyof AggregateOauth]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateOauth[P]>
      : GetScalarType<T[P], AggregateOauth[P]>
  }




  export type oauthGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: oauthWhereInput
    orderBy?: oauthOrderByWithAggregationInput | oauthOrderByWithAggregationInput[]
    by: OauthScalarFieldEnum[] | OauthScalarFieldEnum
    having?: oauthScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: OauthCountAggregateInputType | true
    _avg?: OauthAvgAggregateInputType
    _sum?: OauthSumAggregateInputType
    _min?: OauthMinAggregateInputType
    _max?: OauthMaxAggregateInputType
  }

  export type OauthGroupByOutputType = {
    oauth_name: string
    oauth_type: string
    oauth_data: string
    is_enabled: number
    _count: OauthCountAggregateOutputType | null
    _avg: OauthAvgAggregateOutputType | null
    _sum: OauthSumAggregateOutputType | null
    _min: OauthMinAggregateOutputType | null
    _max: OauthMaxAggregateOutputType | null
  }

  type GetOauthGroupByPayload<T extends oauthGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<OauthGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof OauthGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], OauthGroupByOutputType[P]>
            : GetScalarType<T[P], OauthGroupByOutputType[P]>
        }
      >
    >


  export type oauthSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    oauth_name?: boolean
    oauth_type?: boolean
    oauth_data?: boolean
    is_enabled?: boolean
  }, ExtArgs["result"]["oauth"]>

  export type oauthSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    oauth_name?: boolean
    oauth_type?: boolean
    oauth_data?: boolean
    is_enabled?: boolean
  }, ExtArgs["result"]["oauth"]>

  export type oauthSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    oauth_name?: boolean
    oauth_type?: boolean
    oauth_data?: boolean
    is_enabled?: boolean
  }, ExtArgs["result"]["oauth"]>

  export type oauthSelectScalar = {
    oauth_name?: boolean
    oauth_type?: boolean
    oauth_data?: boolean
    is_enabled?: boolean
  }

  export type oauthOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"oauth_name" | "oauth_type" | "oauth_data" | "is_enabled", ExtArgs["result"]["oauth"]>

  export type $oauthPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "oauth"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      oauth_name: string
      oauth_type: string
      oauth_data: string
      is_enabled: number
    }, ExtArgs["result"]["oauth"]>
    composites: {}
  }

  type oauthGetPayload<S extends boolean | null | undefined | oauthDefaultArgs> = $Result.GetResult<Prisma.$oauthPayload, S>

  type oauthCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<oauthFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: OauthCountAggregateInputType | true
    }

  export interface oauthDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['oauth'], meta: { name: 'oauth' } }
    /**
     * Find zero or one Oauth that matches the filter.
     * @param {oauthFindUniqueArgs} args - Arguments to find a Oauth
     * @example
     * // Get one Oauth
     * const oauth = await prisma.oauth.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends oauthFindUniqueArgs>(args: SelectSubset<T, oauthFindUniqueArgs<ExtArgs>>): Prisma__oauthClient<$Result.GetResult<Prisma.$oauthPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Oauth that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {oauthFindUniqueOrThrowArgs} args - Arguments to find a Oauth
     * @example
     * // Get one Oauth
     * const oauth = await prisma.oauth.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends oauthFindUniqueOrThrowArgs>(args: SelectSubset<T, oauthFindUniqueOrThrowArgs<ExtArgs>>): Prisma__oauthClient<$Result.GetResult<Prisma.$oauthPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Oauth that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {oauthFindFirstArgs} args - Arguments to find a Oauth
     * @example
     * // Get one Oauth
     * const oauth = await prisma.oauth.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends oauthFindFirstArgs>(args?: SelectSubset<T, oauthFindFirstArgs<ExtArgs>>): Prisma__oauthClient<$Result.GetResult<Prisma.$oauthPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Oauth that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {oauthFindFirstOrThrowArgs} args - Arguments to find a Oauth
     * @example
     * // Get one Oauth
     * const oauth = await prisma.oauth.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends oauthFindFirstOrThrowArgs>(args?: SelectSubset<T, oauthFindFirstOrThrowArgs<ExtArgs>>): Prisma__oauthClient<$Result.GetResult<Prisma.$oauthPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Oauths that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {oauthFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Oauths
     * const oauths = await prisma.oauth.findMany()
     * 
     * // Get first 10 Oauths
     * const oauths = await prisma.oauth.findMany({ take: 10 })
     * 
     * // Only select the `oauth_name`
     * const oauthWithOauth_nameOnly = await prisma.oauth.findMany({ select: { oauth_name: true } })
     * 
     */
    findMany<T extends oauthFindManyArgs>(args?: SelectSubset<T, oauthFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$oauthPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Oauth.
     * @param {oauthCreateArgs} args - Arguments to create a Oauth.
     * @example
     * // Create one Oauth
     * const Oauth = await prisma.oauth.create({
     *   data: {
     *     // ... data to create a Oauth
     *   }
     * })
     * 
     */
    create<T extends oauthCreateArgs>(args: SelectSubset<T, oauthCreateArgs<ExtArgs>>): Prisma__oauthClient<$Result.GetResult<Prisma.$oauthPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Oauths.
     * @param {oauthCreateManyArgs} args - Arguments to create many Oauths.
     * @example
     * // Create many Oauths
     * const oauth = await prisma.oauth.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends oauthCreateManyArgs>(args?: SelectSubset<T, oauthCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Oauths and returns the data saved in the database.
     * @param {oauthCreateManyAndReturnArgs} args - Arguments to create many Oauths.
     * @example
     * // Create many Oauths
     * const oauth = await prisma.oauth.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Oauths and only return the `oauth_name`
     * const oauthWithOauth_nameOnly = await prisma.oauth.createManyAndReturn({
     *   select: { oauth_name: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends oauthCreateManyAndReturnArgs>(args?: SelectSubset<T, oauthCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$oauthPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Oauth.
     * @param {oauthDeleteArgs} args - Arguments to delete one Oauth.
     * @example
     * // Delete one Oauth
     * const Oauth = await prisma.oauth.delete({
     *   where: {
     *     // ... filter to delete one Oauth
     *   }
     * })
     * 
     */
    delete<T extends oauthDeleteArgs>(args: SelectSubset<T, oauthDeleteArgs<ExtArgs>>): Prisma__oauthClient<$Result.GetResult<Prisma.$oauthPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Oauth.
     * @param {oauthUpdateArgs} args - Arguments to update one Oauth.
     * @example
     * // Update one Oauth
     * const oauth = await prisma.oauth.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends oauthUpdateArgs>(args: SelectSubset<T, oauthUpdateArgs<ExtArgs>>): Prisma__oauthClient<$Result.GetResult<Prisma.$oauthPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Oauths.
     * @param {oauthDeleteManyArgs} args - Arguments to filter Oauths to delete.
     * @example
     * // Delete a few Oauths
     * const { count } = await prisma.oauth.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends oauthDeleteManyArgs>(args?: SelectSubset<T, oauthDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Oauths.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {oauthUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Oauths
     * const oauth = await prisma.oauth.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends oauthUpdateManyArgs>(args: SelectSubset<T, oauthUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Oauths and returns the data updated in the database.
     * @param {oauthUpdateManyAndReturnArgs} args - Arguments to update many Oauths.
     * @example
     * // Update many Oauths
     * const oauth = await prisma.oauth.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Oauths and only return the `oauth_name`
     * const oauthWithOauth_nameOnly = await prisma.oauth.updateManyAndReturn({
     *   select: { oauth_name: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends oauthUpdateManyAndReturnArgs>(args: SelectSubset<T, oauthUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$oauthPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Oauth.
     * @param {oauthUpsertArgs} args - Arguments to update or create a Oauth.
     * @example
     * // Update or create a Oauth
     * const oauth = await prisma.oauth.upsert({
     *   create: {
     *     // ... data to create a Oauth
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Oauth we want to update
     *   }
     * })
     */
    upsert<T extends oauthUpsertArgs>(args: SelectSubset<T, oauthUpsertArgs<ExtArgs>>): Prisma__oauthClient<$Result.GetResult<Prisma.$oauthPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Oauths.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {oauthCountArgs} args - Arguments to filter Oauths to count.
     * @example
     * // Count the number of Oauths
     * const count = await prisma.oauth.count({
     *   where: {
     *     // ... the filter for the Oauths we want to count
     *   }
     * })
    **/
    count<T extends oauthCountArgs>(
      args?: Subset<T, oauthCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], OauthCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Oauth.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OauthAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends OauthAggregateArgs>(args: Subset<T, OauthAggregateArgs>): Prisma.PrismaPromise<GetOauthAggregateType<T>>

    /**
     * Group by Oauth.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {oauthGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends oauthGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: oauthGroupByArgs['orderBy'] }
        : { orderBy?: oauthGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, oauthGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetOauthGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the oauth model
   */
  readonly fields: oauthFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for oauth.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__oauthClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the oauth model
   */
  interface oauthFieldRefs {
    readonly oauth_name: FieldRef<"oauth", 'String'>
    readonly oauth_type: FieldRef<"oauth", 'String'>
    readonly oauth_data: FieldRef<"oauth", 'String'>
    readonly is_enabled: FieldRef<"oauth", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * oauth findUnique
   */
  export type oauthFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the oauth
     */
    select?: oauthSelect<ExtArgs> | null
    /**
     * Omit specific fields from the oauth
     */
    omit?: oauthOmit<ExtArgs> | null
    /**
     * Filter, which oauth to fetch.
     */
    where: oauthWhereUniqueInput
  }

  /**
   * oauth findUniqueOrThrow
   */
  export type oauthFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the oauth
     */
    select?: oauthSelect<ExtArgs> | null
    /**
     * Omit specific fields from the oauth
     */
    omit?: oauthOmit<ExtArgs> | null
    /**
     * Filter, which oauth to fetch.
     */
    where: oauthWhereUniqueInput
  }

  /**
   * oauth findFirst
   */
  export type oauthFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the oauth
     */
    select?: oauthSelect<ExtArgs> | null
    /**
     * Omit specific fields from the oauth
     */
    omit?: oauthOmit<ExtArgs> | null
    /**
     * Filter, which oauth to fetch.
     */
    where?: oauthWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of oauths to fetch.
     */
    orderBy?: oauthOrderByWithRelationInput | oauthOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for oauths.
     */
    cursor?: oauthWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` oauths from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` oauths.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of oauths.
     */
    distinct?: OauthScalarFieldEnum | OauthScalarFieldEnum[]
  }

  /**
   * oauth findFirstOrThrow
   */
  export type oauthFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the oauth
     */
    select?: oauthSelect<ExtArgs> | null
    /**
     * Omit specific fields from the oauth
     */
    omit?: oauthOmit<ExtArgs> | null
    /**
     * Filter, which oauth to fetch.
     */
    where?: oauthWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of oauths to fetch.
     */
    orderBy?: oauthOrderByWithRelationInput | oauthOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for oauths.
     */
    cursor?: oauthWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` oauths from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` oauths.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of oauths.
     */
    distinct?: OauthScalarFieldEnum | OauthScalarFieldEnum[]
  }

  /**
   * oauth findMany
   */
  export type oauthFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the oauth
     */
    select?: oauthSelect<ExtArgs> | null
    /**
     * Omit specific fields from the oauth
     */
    omit?: oauthOmit<ExtArgs> | null
    /**
     * Filter, which oauths to fetch.
     */
    where?: oauthWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of oauths to fetch.
     */
    orderBy?: oauthOrderByWithRelationInput | oauthOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing oauths.
     */
    cursor?: oauthWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` oauths from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` oauths.
     */
    skip?: number
    distinct?: OauthScalarFieldEnum | OauthScalarFieldEnum[]
  }

  /**
   * oauth create
   */
  export type oauthCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the oauth
     */
    select?: oauthSelect<ExtArgs> | null
    /**
     * Omit specific fields from the oauth
     */
    omit?: oauthOmit<ExtArgs> | null
    /**
     * The data needed to create a oauth.
     */
    data: XOR<oauthCreateInput, oauthUncheckedCreateInput>
  }

  /**
   * oauth createMany
   */
  export type oauthCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many oauths.
     */
    data: oauthCreateManyInput | oauthCreateManyInput[]
  }

  /**
   * oauth createManyAndReturn
   */
  export type oauthCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the oauth
     */
    select?: oauthSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the oauth
     */
    omit?: oauthOmit<ExtArgs> | null
    /**
     * The data used to create many oauths.
     */
    data: oauthCreateManyInput | oauthCreateManyInput[]
  }

  /**
   * oauth update
   */
  export type oauthUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the oauth
     */
    select?: oauthSelect<ExtArgs> | null
    /**
     * Omit specific fields from the oauth
     */
    omit?: oauthOmit<ExtArgs> | null
    /**
     * The data needed to update a oauth.
     */
    data: XOR<oauthUpdateInput, oauthUncheckedUpdateInput>
    /**
     * Choose, which oauth to update.
     */
    where: oauthWhereUniqueInput
  }

  /**
   * oauth updateMany
   */
  export type oauthUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update oauths.
     */
    data: XOR<oauthUpdateManyMutationInput, oauthUncheckedUpdateManyInput>
    /**
     * Filter which oauths to update
     */
    where?: oauthWhereInput
    /**
     * Limit how many oauths to update.
     */
    limit?: number
  }

  /**
   * oauth updateManyAndReturn
   */
  export type oauthUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the oauth
     */
    select?: oauthSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the oauth
     */
    omit?: oauthOmit<ExtArgs> | null
    /**
     * The data used to update oauths.
     */
    data: XOR<oauthUpdateManyMutationInput, oauthUncheckedUpdateManyInput>
    /**
     * Filter which oauths to update
     */
    where?: oauthWhereInput
    /**
     * Limit how many oauths to update.
     */
    limit?: number
  }

  /**
   * oauth upsert
   */
  export type oauthUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the oauth
     */
    select?: oauthSelect<ExtArgs> | null
    /**
     * Omit specific fields from the oauth
     */
    omit?: oauthOmit<ExtArgs> | null
    /**
     * The filter to search for the oauth to update in case it exists.
     */
    where: oauthWhereUniqueInput
    /**
     * In case the oauth found by the `where` argument doesn't exist, create a new oauth with this data.
     */
    create: XOR<oauthCreateInput, oauthUncheckedCreateInput>
    /**
     * In case the oauth was found with the provided `where` argument, update it with this data.
     */
    update: XOR<oauthUpdateInput, oauthUncheckedUpdateInput>
  }

  /**
   * oauth delete
   */
  export type oauthDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the oauth
     */
    select?: oauthSelect<ExtArgs> | null
    /**
     * Omit specific fields from the oauth
     */
    omit?: oauthOmit<ExtArgs> | null
    /**
     * Filter which oauth to delete.
     */
    where: oauthWhereUniqueInput
  }

  /**
   * oauth deleteMany
   */
  export type oauthDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which oauths to delete
     */
    where?: oauthWhereInput
    /**
     * Limit how many oauths to delete.
     */
    limit?: number
  }

  /**
   * oauth without action
   */
  export type oauthDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the oauth
     */
    select?: oauthSelect<ExtArgs> | null
    /**
     * Omit specific fields from the oauth
     */
    omit?: oauthOmit<ExtArgs> | null
  }


  /**
   * Model binds
   */

  export type AggregateBinds = {
    _count: BindsCountAggregateOutputType | null
    _avg: BindsAvgAggregateOutputType | null
    _sum: BindsSumAggregateOutputType | null
    _min: BindsMinAggregateOutputType | null
    _max: BindsMaxAggregateOutputType | null
  }

  export type BindsAvgAggregateOutputType = {
    is_enabled: number | null
  }

  export type BindsSumAggregateOutputType = {
    is_enabled: number | null
  }

  export type BindsMinAggregateOutputType = {
    oauth_uuid: string | null
    oauth_name: string | null
    binds_user: string | null
    binds_data: string | null
    is_enabled: number | null
  }

  export type BindsMaxAggregateOutputType = {
    oauth_uuid: string | null
    oauth_name: string | null
    binds_user: string | null
    binds_data: string | null
    is_enabled: number | null
  }

  export type BindsCountAggregateOutputType = {
    oauth_uuid: number
    oauth_name: number
    binds_user: number
    binds_data: number
    is_enabled: number
    _all: number
  }


  export type BindsAvgAggregateInputType = {
    is_enabled?: true
  }

  export type BindsSumAggregateInputType = {
    is_enabled?: true
  }

  export type BindsMinAggregateInputType = {
    oauth_uuid?: true
    oauth_name?: true
    binds_user?: true
    binds_data?: true
    is_enabled?: true
  }

  export type BindsMaxAggregateInputType = {
    oauth_uuid?: true
    oauth_name?: true
    binds_user?: true
    binds_data?: true
    is_enabled?: true
  }

  export type BindsCountAggregateInputType = {
    oauth_uuid?: true
    oauth_name?: true
    binds_user?: true
    binds_data?: true
    is_enabled?: true
    _all?: true
  }

  export type BindsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which binds to aggregate.
     */
    where?: bindsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of binds to fetch.
     */
    orderBy?: bindsOrderByWithRelationInput | bindsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: bindsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` binds from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` binds.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned binds
    **/
    _count?: true | BindsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: BindsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: BindsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: BindsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: BindsMaxAggregateInputType
  }

  export type GetBindsAggregateType<T extends BindsAggregateArgs> = {
        [P in keyof T & keyof AggregateBinds]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateBinds[P]>
      : GetScalarType<T[P], AggregateBinds[P]>
  }




  export type bindsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: bindsWhereInput
    orderBy?: bindsOrderByWithAggregationInput | bindsOrderByWithAggregationInput[]
    by: BindsScalarFieldEnum[] | BindsScalarFieldEnum
    having?: bindsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: BindsCountAggregateInputType | true
    _avg?: BindsAvgAggregateInputType
    _sum?: BindsSumAggregateInputType
    _min?: BindsMinAggregateInputType
    _max?: BindsMaxAggregateInputType
  }

  export type BindsGroupByOutputType = {
    oauth_uuid: string
    oauth_name: string
    binds_user: string
    binds_data: string
    is_enabled: number
    _count: BindsCountAggregateOutputType | null
    _avg: BindsAvgAggregateOutputType | null
    _sum: BindsSumAggregateOutputType | null
    _min: BindsMinAggregateOutputType | null
    _max: BindsMaxAggregateOutputType | null
  }

  type GetBindsGroupByPayload<T extends bindsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<BindsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof BindsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], BindsGroupByOutputType[P]>
            : GetScalarType<T[P], BindsGroupByOutputType[P]>
        }
      >
    >


  export type bindsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    oauth_uuid?: boolean
    oauth_name?: boolean
    binds_user?: boolean
    binds_data?: boolean
    is_enabled?: boolean
  }, ExtArgs["result"]["binds"]>

  export type bindsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    oauth_uuid?: boolean
    oauth_name?: boolean
    binds_user?: boolean
    binds_data?: boolean
    is_enabled?: boolean
  }, ExtArgs["result"]["binds"]>

  export type bindsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    oauth_uuid?: boolean
    oauth_name?: boolean
    binds_user?: boolean
    binds_data?: boolean
    is_enabled?: boolean
  }, ExtArgs["result"]["binds"]>

  export type bindsSelectScalar = {
    oauth_uuid?: boolean
    oauth_name?: boolean
    binds_user?: boolean
    binds_data?: boolean
    is_enabled?: boolean
  }

  export type bindsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"oauth_uuid" | "oauth_name" | "binds_user" | "binds_data" | "is_enabled", ExtArgs["result"]["binds"]>

  export type $bindsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "binds"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      oauth_uuid: string
      oauth_name: string
      binds_user: string
      binds_data: string
      is_enabled: number
    }, ExtArgs["result"]["binds"]>
    composites: {}
  }

  type bindsGetPayload<S extends boolean | null | undefined | bindsDefaultArgs> = $Result.GetResult<Prisma.$bindsPayload, S>

  type bindsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<bindsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: BindsCountAggregateInputType | true
    }

  export interface bindsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['binds'], meta: { name: 'binds' } }
    /**
     * Find zero or one Binds that matches the filter.
     * @param {bindsFindUniqueArgs} args - Arguments to find a Binds
     * @example
     * // Get one Binds
     * const binds = await prisma.binds.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends bindsFindUniqueArgs>(args: SelectSubset<T, bindsFindUniqueArgs<ExtArgs>>): Prisma__bindsClient<$Result.GetResult<Prisma.$bindsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Binds that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {bindsFindUniqueOrThrowArgs} args - Arguments to find a Binds
     * @example
     * // Get one Binds
     * const binds = await prisma.binds.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends bindsFindUniqueOrThrowArgs>(args: SelectSubset<T, bindsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__bindsClient<$Result.GetResult<Prisma.$bindsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Binds that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {bindsFindFirstArgs} args - Arguments to find a Binds
     * @example
     * // Get one Binds
     * const binds = await prisma.binds.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends bindsFindFirstArgs>(args?: SelectSubset<T, bindsFindFirstArgs<ExtArgs>>): Prisma__bindsClient<$Result.GetResult<Prisma.$bindsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Binds that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {bindsFindFirstOrThrowArgs} args - Arguments to find a Binds
     * @example
     * // Get one Binds
     * const binds = await prisma.binds.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends bindsFindFirstOrThrowArgs>(args?: SelectSubset<T, bindsFindFirstOrThrowArgs<ExtArgs>>): Prisma__bindsClient<$Result.GetResult<Prisma.$bindsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Binds that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {bindsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Binds
     * const binds = await prisma.binds.findMany()
     * 
     * // Get first 10 Binds
     * const binds = await prisma.binds.findMany({ take: 10 })
     * 
     * // Only select the `oauth_uuid`
     * const bindsWithOauth_uuidOnly = await prisma.binds.findMany({ select: { oauth_uuid: true } })
     * 
     */
    findMany<T extends bindsFindManyArgs>(args?: SelectSubset<T, bindsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$bindsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Binds.
     * @param {bindsCreateArgs} args - Arguments to create a Binds.
     * @example
     * // Create one Binds
     * const Binds = await prisma.binds.create({
     *   data: {
     *     // ... data to create a Binds
     *   }
     * })
     * 
     */
    create<T extends bindsCreateArgs>(args: SelectSubset<T, bindsCreateArgs<ExtArgs>>): Prisma__bindsClient<$Result.GetResult<Prisma.$bindsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Binds.
     * @param {bindsCreateManyArgs} args - Arguments to create many Binds.
     * @example
     * // Create many Binds
     * const binds = await prisma.binds.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends bindsCreateManyArgs>(args?: SelectSubset<T, bindsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Binds and returns the data saved in the database.
     * @param {bindsCreateManyAndReturnArgs} args - Arguments to create many Binds.
     * @example
     * // Create many Binds
     * const binds = await prisma.binds.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Binds and only return the `oauth_uuid`
     * const bindsWithOauth_uuidOnly = await prisma.binds.createManyAndReturn({
     *   select: { oauth_uuid: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends bindsCreateManyAndReturnArgs>(args?: SelectSubset<T, bindsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$bindsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Binds.
     * @param {bindsDeleteArgs} args - Arguments to delete one Binds.
     * @example
     * // Delete one Binds
     * const Binds = await prisma.binds.delete({
     *   where: {
     *     // ... filter to delete one Binds
     *   }
     * })
     * 
     */
    delete<T extends bindsDeleteArgs>(args: SelectSubset<T, bindsDeleteArgs<ExtArgs>>): Prisma__bindsClient<$Result.GetResult<Prisma.$bindsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Binds.
     * @param {bindsUpdateArgs} args - Arguments to update one Binds.
     * @example
     * // Update one Binds
     * const binds = await prisma.binds.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends bindsUpdateArgs>(args: SelectSubset<T, bindsUpdateArgs<ExtArgs>>): Prisma__bindsClient<$Result.GetResult<Prisma.$bindsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Binds.
     * @param {bindsDeleteManyArgs} args - Arguments to filter Binds to delete.
     * @example
     * // Delete a few Binds
     * const { count } = await prisma.binds.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends bindsDeleteManyArgs>(args?: SelectSubset<T, bindsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Binds.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {bindsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Binds
     * const binds = await prisma.binds.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends bindsUpdateManyArgs>(args: SelectSubset<T, bindsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Binds and returns the data updated in the database.
     * @param {bindsUpdateManyAndReturnArgs} args - Arguments to update many Binds.
     * @example
     * // Update many Binds
     * const binds = await prisma.binds.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Binds and only return the `oauth_uuid`
     * const bindsWithOauth_uuidOnly = await prisma.binds.updateManyAndReturn({
     *   select: { oauth_uuid: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends bindsUpdateManyAndReturnArgs>(args: SelectSubset<T, bindsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$bindsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Binds.
     * @param {bindsUpsertArgs} args - Arguments to update or create a Binds.
     * @example
     * // Update or create a Binds
     * const binds = await prisma.binds.upsert({
     *   create: {
     *     // ... data to create a Binds
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Binds we want to update
     *   }
     * })
     */
    upsert<T extends bindsUpsertArgs>(args: SelectSubset<T, bindsUpsertArgs<ExtArgs>>): Prisma__bindsClient<$Result.GetResult<Prisma.$bindsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Binds.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {bindsCountArgs} args - Arguments to filter Binds to count.
     * @example
     * // Count the number of Binds
     * const count = await prisma.binds.count({
     *   where: {
     *     // ... the filter for the Binds we want to count
     *   }
     * })
    **/
    count<T extends bindsCountArgs>(
      args?: Subset<T, bindsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], BindsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Binds.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BindsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends BindsAggregateArgs>(args: Subset<T, BindsAggregateArgs>): Prisma.PrismaPromise<GetBindsAggregateType<T>>

    /**
     * Group by Binds.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {bindsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends bindsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: bindsGroupByArgs['orderBy'] }
        : { orderBy?: bindsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, bindsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetBindsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the binds model
   */
  readonly fields: bindsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for binds.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__bindsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the binds model
   */
  interface bindsFieldRefs {
    readonly oauth_uuid: FieldRef<"binds", 'String'>
    readonly oauth_name: FieldRef<"binds", 'String'>
    readonly binds_user: FieldRef<"binds", 'String'>
    readonly binds_data: FieldRef<"binds", 'String'>
    readonly is_enabled: FieldRef<"binds", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * binds findUnique
   */
  export type bindsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the binds
     */
    select?: bindsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the binds
     */
    omit?: bindsOmit<ExtArgs> | null
    /**
     * Filter, which binds to fetch.
     */
    where: bindsWhereUniqueInput
  }

  /**
   * binds findUniqueOrThrow
   */
  export type bindsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the binds
     */
    select?: bindsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the binds
     */
    omit?: bindsOmit<ExtArgs> | null
    /**
     * Filter, which binds to fetch.
     */
    where: bindsWhereUniqueInput
  }

  /**
   * binds findFirst
   */
  export type bindsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the binds
     */
    select?: bindsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the binds
     */
    omit?: bindsOmit<ExtArgs> | null
    /**
     * Filter, which binds to fetch.
     */
    where?: bindsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of binds to fetch.
     */
    orderBy?: bindsOrderByWithRelationInput | bindsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for binds.
     */
    cursor?: bindsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` binds from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` binds.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of binds.
     */
    distinct?: BindsScalarFieldEnum | BindsScalarFieldEnum[]
  }

  /**
   * binds findFirstOrThrow
   */
  export type bindsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the binds
     */
    select?: bindsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the binds
     */
    omit?: bindsOmit<ExtArgs> | null
    /**
     * Filter, which binds to fetch.
     */
    where?: bindsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of binds to fetch.
     */
    orderBy?: bindsOrderByWithRelationInput | bindsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for binds.
     */
    cursor?: bindsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` binds from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` binds.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of binds.
     */
    distinct?: BindsScalarFieldEnum | BindsScalarFieldEnum[]
  }

  /**
   * binds findMany
   */
  export type bindsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the binds
     */
    select?: bindsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the binds
     */
    omit?: bindsOmit<ExtArgs> | null
    /**
     * Filter, which binds to fetch.
     */
    where?: bindsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of binds to fetch.
     */
    orderBy?: bindsOrderByWithRelationInput | bindsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing binds.
     */
    cursor?: bindsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` binds from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` binds.
     */
    skip?: number
    distinct?: BindsScalarFieldEnum | BindsScalarFieldEnum[]
  }

  /**
   * binds create
   */
  export type bindsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the binds
     */
    select?: bindsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the binds
     */
    omit?: bindsOmit<ExtArgs> | null
    /**
     * The data needed to create a binds.
     */
    data: XOR<bindsCreateInput, bindsUncheckedCreateInput>
  }

  /**
   * binds createMany
   */
  export type bindsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many binds.
     */
    data: bindsCreateManyInput | bindsCreateManyInput[]
  }

  /**
   * binds createManyAndReturn
   */
  export type bindsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the binds
     */
    select?: bindsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the binds
     */
    omit?: bindsOmit<ExtArgs> | null
    /**
     * The data used to create many binds.
     */
    data: bindsCreateManyInput | bindsCreateManyInput[]
  }

  /**
   * binds update
   */
  export type bindsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the binds
     */
    select?: bindsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the binds
     */
    omit?: bindsOmit<ExtArgs> | null
    /**
     * The data needed to update a binds.
     */
    data: XOR<bindsUpdateInput, bindsUncheckedUpdateInput>
    /**
     * Choose, which binds to update.
     */
    where: bindsWhereUniqueInput
  }

  /**
   * binds updateMany
   */
  export type bindsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update binds.
     */
    data: XOR<bindsUpdateManyMutationInput, bindsUncheckedUpdateManyInput>
    /**
     * Filter which binds to update
     */
    where?: bindsWhereInput
    /**
     * Limit how many binds to update.
     */
    limit?: number
  }

  /**
   * binds updateManyAndReturn
   */
  export type bindsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the binds
     */
    select?: bindsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the binds
     */
    omit?: bindsOmit<ExtArgs> | null
    /**
     * The data used to update binds.
     */
    data: XOR<bindsUpdateManyMutationInput, bindsUncheckedUpdateManyInput>
    /**
     * Filter which binds to update
     */
    where?: bindsWhereInput
    /**
     * Limit how many binds to update.
     */
    limit?: number
  }

  /**
   * binds upsert
   */
  export type bindsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the binds
     */
    select?: bindsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the binds
     */
    omit?: bindsOmit<ExtArgs> | null
    /**
     * The filter to search for the binds to update in case it exists.
     */
    where: bindsWhereUniqueInput
    /**
     * In case the binds found by the `where` argument doesn't exist, create a new binds with this data.
     */
    create: XOR<bindsCreateInput, bindsUncheckedCreateInput>
    /**
     * In case the binds was found with the provided `where` argument, update it with this data.
     */
    update: XOR<bindsUpdateInput, bindsUncheckedUpdateInput>
  }

  /**
   * binds delete
   */
  export type bindsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the binds
     */
    select?: bindsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the binds
     */
    omit?: bindsOmit<ExtArgs> | null
    /**
     * Filter which binds to delete.
     */
    where: bindsWhereUniqueInput
  }

  /**
   * binds deleteMany
   */
  export type bindsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which binds to delete
     */
    where?: bindsWhereInput
    /**
     * Limit how many binds to delete.
     */
    limit?: number
  }

  /**
   * binds without action
   */
  export type bindsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the binds
     */
    select?: bindsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the binds
     */
    omit?: bindsOmit<ExtArgs> | null
  }


  /**
   * Model crypt
   */

  export type AggregateCrypt = {
    _count: CryptCountAggregateOutputType | null
    _avg: CryptAvgAggregateOutputType | null
    _sum: CryptSumAggregateOutputType | null
    _min: CryptMinAggregateOutputType | null
    _max: CryptMaxAggregateOutputType | null
  }

  export type CryptAvgAggregateOutputType = {
    crypt_type: number | null
    crypt_mode: number | null
    is_enabled: number | null
    crypt_self: number | null
    rands_pass: number | null
  }

  export type CryptSumAggregateOutputType = {
    crypt_type: number | null
    crypt_mode: number | null
    is_enabled: number | null
    crypt_self: number | null
    rands_pass: number | null
  }

  export type CryptMinAggregateOutputType = {
    crypt_name: string | null
    crypt_pass: string | null
    crypt_type: number | null
    crypt_mode: number | null
    is_enabled: number | null
    crypt_self: number | null
    rands_pass: number | null
    oauth_data: string | null
    write_name: string | null
  }

  export type CryptMaxAggregateOutputType = {
    crypt_name: string | null
    crypt_pass: string | null
    crypt_type: number | null
    crypt_mode: number | null
    is_enabled: number | null
    crypt_self: number | null
    rands_pass: number | null
    oauth_data: string | null
    write_name: string | null
  }

  export type CryptCountAggregateOutputType = {
    crypt_name: number
    crypt_pass: number
    crypt_type: number
    crypt_mode: number
    is_enabled: number
    crypt_self: number
    rands_pass: number
    oauth_data: number
    write_name: number
    _all: number
  }


  export type CryptAvgAggregateInputType = {
    crypt_type?: true
    crypt_mode?: true
    is_enabled?: true
    crypt_self?: true
    rands_pass?: true
  }

  export type CryptSumAggregateInputType = {
    crypt_type?: true
    crypt_mode?: true
    is_enabled?: true
    crypt_self?: true
    rands_pass?: true
  }

  export type CryptMinAggregateInputType = {
    crypt_name?: true
    crypt_pass?: true
    crypt_type?: true
    crypt_mode?: true
    is_enabled?: true
    crypt_self?: true
    rands_pass?: true
    oauth_data?: true
    write_name?: true
  }

  export type CryptMaxAggregateInputType = {
    crypt_name?: true
    crypt_pass?: true
    crypt_type?: true
    crypt_mode?: true
    is_enabled?: true
    crypt_self?: true
    rands_pass?: true
    oauth_data?: true
    write_name?: true
  }

  export type CryptCountAggregateInputType = {
    crypt_name?: true
    crypt_pass?: true
    crypt_type?: true
    crypt_mode?: true
    is_enabled?: true
    crypt_self?: true
    rands_pass?: true
    oauth_data?: true
    write_name?: true
    _all?: true
  }

  export type CryptAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which crypt to aggregate.
     */
    where?: cryptWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of crypts to fetch.
     */
    orderBy?: cryptOrderByWithRelationInput | cryptOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: cryptWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` crypts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` crypts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned crypts
    **/
    _count?: true | CryptCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CryptAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CryptSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CryptMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CryptMaxAggregateInputType
  }

  export type GetCryptAggregateType<T extends CryptAggregateArgs> = {
        [P in keyof T & keyof AggregateCrypt]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCrypt[P]>
      : GetScalarType<T[P], AggregateCrypt[P]>
  }




  export type cryptGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: cryptWhereInput
    orderBy?: cryptOrderByWithAggregationInput | cryptOrderByWithAggregationInput[]
    by: CryptScalarFieldEnum[] | CryptScalarFieldEnum
    having?: cryptScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CryptCountAggregateInputType | true
    _avg?: CryptAvgAggregateInputType
    _sum?: CryptSumAggregateInputType
    _min?: CryptMinAggregateInputType
    _max?: CryptMaxAggregateInputType
  }

  export type CryptGroupByOutputType = {
    crypt_name: string
    crypt_pass: string
    crypt_type: number
    crypt_mode: number
    is_enabled: number
    crypt_self: number | null
    rands_pass: number | null
    oauth_data: string | null
    write_name: string | null
    _count: CryptCountAggregateOutputType | null
    _avg: CryptAvgAggregateOutputType | null
    _sum: CryptSumAggregateOutputType | null
    _min: CryptMinAggregateOutputType | null
    _max: CryptMaxAggregateOutputType | null
  }

  type GetCryptGroupByPayload<T extends cryptGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CryptGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CryptGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CryptGroupByOutputType[P]>
            : GetScalarType<T[P], CryptGroupByOutputType[P]>
        }
      >
    >


  export type cryptSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    crypt_name?: boolean
    crypt_pass?: boolean
    crypt_type?: boolean
    crypt_mode?: boolean
    is_enabled?: boolean
    crypt_self?: boolean
    rands_pass?: boolean
    oauth_data?: boolean
    write_name?: boolean
  }, ExtArgs["result"]["crypt"]>

  export type cryptSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    crypt_name?: boolean
    crypt_pass?: boolean
    crypt_type?: boolean
    crypt_mode?: boolean
    is_enabled?: boolean
    crypt_self?: boolean
    rands_pass?: boolean
    oauth_data?: boolean
    write_name?: boolean
  }, ExtArgs["result"]["crypt"]>

  export type cryptSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    crypt_name?: boolean
    crypt_pass?: boolean
    crypt_type?: boolean
    crypt_mode?: boolean
    is_enabled?: boolean
    crypt_self?: boolean
    rands_pass?: boolean
    oauth_data?: boolean
    write_name?: boolean
  }, ExtArgs["result"]["crypt"]>

  export type cryptSelectScalar = {
    crypt_name?: boolean
    crypt_pass?: boolean
    crypt_type?: boolean
    crypt_mode?: boolean
    is_enabled?: boolean
    crypt_self?: boolean
    rands_pass?: boolean
    oauth_data?: boolean
    write_name?: boolean
  }

  export type cryptOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"crypt_name" | "crypt_pass" | "crypt_type" | "crypt_mode" | "is_enabled" | "crypt_self" | "rands_pass" | "oauth_data" | "write_name", ExtArgs["result"]["crypt"]>

  export type $cryptPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "crypt"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      crypt_name: string
      crypt_pass: string
      crypt_type: number
      crypt_mode: number
      is_enabled: number
      crypt_self: number | null
      rands_pass: number | null
      oauth_data: string | null
      write_name: string | null
    }, ExtArgs["result"]["crypt"]>
    composites: {}
  }

  type cryptGetPayload<S extends boolean | null | undefined | cryptDefaultArgs> = $Result.GetResult<Prisma.$cryptPayload, S>

  type cryptCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<cryptFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CryptCountAggregateInputType | true
    }

  export interface cryptDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['crypt'], meta: { name: 'crypt' } }
    /**
     * Find zero or one Crypt that matches the filter.
     * @param {cryptFindUniqueArgs} args - Arguments to find a Crypt
     * @example
     * // Get one Crypt
     * const crypt = await prisma.crypt.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends cryptFindUniqueArgs>(args: SelectSubset<T, cryptFindUniqueArgs<ExtArgs>>): Prisma__cryptClient<$Result.GetResult<Prisma.$cryptPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Crypt that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {cryptFindUniqueOrThrowArgs} args - Arguments to find a Crypt
     * @example
     * // Get one Crypt
     * const crypt = await prisma.crypt.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends cryptFindUniqueOrThrowArgs>(args: SelectSubset<T, cryptFindUniqueOrThrowArgs<ExtArgs>>): Prisma__cryptClient<$Result.GetResult<Prisma.$cryptPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Crypt that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {cryptFindFirstArgs} args - Arguments to find a Crypt
     * @example
     * // Get one Crypt
     * const crypt = await prisma.crypt.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends cryptFindFirstArgs>(args?: SelectSubset<T, cryptFindFirstArgs<ExtArgs>>): Prisma__cryptClient<$Result.GetResult<Prisma.$cryptPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Crypt that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {cryptFindFirstOrThrowArgs} args - Arguments to find a Crypt
     * @example
     * // Get one Crypt
     * const crypt = await prisma.crypt.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends cryptFindFirstOrThrowArgs>(args?: SelectSubset<T, cryptFindFirstOrThrowArgs<ExtArgs>>): Prisma__cryptClient<$Result.GetResult<Prisma.$cryptPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Crypts that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {cryptFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Crypts
     * const crypts = await prisma.crypt.findMany()
     * 
     * // Get first 10 Crypts
     * const crypts = await prisma.crypt.findMany({ take: 10 })
     * 
     * // Only select the `crypt_name`
     * const cryptWithCrypt_nameOnly = await prisma.crypt.findMany({ select: { crypt_name: true } })
     * 
     */
    findMany<T extends cryptFindManyArgs>(args?: SelectSubset<T, cryptFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$cryptPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Crypt.
     * @param {cryptCreateArgs} args - Arguments to create a Crypt.
     * @example
     * // Create one Crypt
     * const Crypt = await prisma.crypt.create({
     *   data: {
     *     // ... data to create a Crypt
     *   }
     * })
     * 
     */
    create<T extends cryptCreateArgs>(args: SelectSubset<T, cryptCreateArgs<ExtArgs>>): Prisma__cryptClient<$Result.GetResult<Prisma.$cryptPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Crypts.
     * @param {cryptCreateManyArgs} args - Arguments to create many Crypts.
     * @example
     * // Create many Crypts
     * const crypt = await prisma.crypt.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends cryptCreateManyArgs>(args?: SelectSubset<T, cryptCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Crypts and returns the data saved in the database.
     * @param {cryptCreateManyAndReturnArgs} args - Arguments to create many Crypts.
     * @example
     * // Create many Crypts
     * const crypt = await prisma.crypt.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Crypts and only return the `crypt_name`
     * const cryptWithCrypt_nameOnly = await prisma.crypt.createManyAndReturn({
     *   select: { crypt_name: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends cryptCreateManyAndReturnArgs>(args?: SelectSubset<T, cryptCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$cryptPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Crypt.
     * @param {cryptDeleteArgs} args - Arguments to delete one Crypt.
     * @example
     * // Delete one Crypt
     * const Crypt = await prisma.crypt.delete({
     *   where: {
     *     // ... filter to delete one Crypt
     *   }
     * })
     * 
     */
    delete<T extends cryptDeleteArgs>(args: SelectSubset<T, cryptDeleteArgs<ExtArgs>>): Prisma__cryptClient<$Result.GetResult<Prisma.$cryptPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Crypt.
     * @param {cryptUpdateArgs} args - Arguments to update one Crypt.
     * @example
     * // Update one Crypt
     * const crypt = await prisma.crypt.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends cryptUpdateArgs>(args: SelectSubset<T, cryptUpdateArgs<ExtArgs>>): Prisma__cryptClient<$Result.GetResult<Prisma.$cryptPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Crypts.
     * @param {cryptDeleteManyArgs} args - Arguments to filter Crypts to delete.
     * @example
     * // Delete a few Crypts
     * const { count } = await prisma.crypt.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends cryptDeleteManyArgs>(args?: SelectSubset<T, cryptDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Crypts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {cryptUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Crypts
     * const crypt = await prisma.crypt.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends cryptUpdateManyArgs>(args: SelectSubset<T, cryptUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Crypts and returns the data updated in the database.
     * @param {cryptUpdateManyAndReturnArgs} args - Arguments to update many Crypts.
     * @example
     * // Update many Crypts
     * const crypt = await prisma.crypt.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Crypts and only return the `crypt_name`
     * const cryptWithCrypt_nameOnly = await prisma.crypt.updateManyAndReturn({
     *   select: { crypt_name: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends cryptUpdateManyAndReturnArgs>(args: SelectSubset<T, cryptUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$cryptPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Crypt.
     * @param {cryptUpsertArgs} args - Arguments to update or create a Crypt.
     * @example
     * // Update or create a Crypt
     * const crypt = await prisma.crypt.upsert({
     *   create: {
     *     // ... data to create a Crypt
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Crypt we want to update
     *   }
     * })
     */
    upsert<T extends cryptUpsertArgs>(args: SelectSubset<T, cryptUpsertArgs<ExtArgs>>): Prisma__cryptClient<$Result.GetResult<Prisma.$cryptPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Crypts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {cryptCountArgs} args - Arguments to filter Crypts to count.
     * @example
     * // Count the number of Crypts
     * const count = await prisma.crypt.count({
     *   where: {
     *     // ... the filter for the Crypts we want to count
     *   }
     * })
    **/
    count<T extends cryptCountArgs>(
      args?: Subset<T, cryptCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CryptCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Crypt.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CryptAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CryptAggregateArgs>(args: Subset<T, CryptAggregateArgs>): Prisma.PrismaPromise<GetCryptAggregateType<T>>

    /**
     * Group by Crypt.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {cryptGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends cryptGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: cryptGroupByArgs['orderBy'] }
        : { orderBy?: cryptGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, cryptGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCryptGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the crypt model
   */
  readonly fields: cryptFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for crypt.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__cryptClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the crypt model
   */
  interface cryptFieldRefs {
    readonly crypt_name: FieldRef<"crypt", 'String'>
    readonly crypt_pass: FieldRef<"crypt", 'String'>
    readonly crypt_type: FieldRef<"crypt", 'Int'>
    readonly crypt_mode: FieldRef<"crypt", 'Int'>
    readonly is_enabled: FieldRef<"crypt", 'Int'>
    readonly crypt_self: FieldRef<"crypt", 'Int'>
    readonly rands_pass: FieldRef<"crypt", 'Int'>
    readonly oauth_data: FieldRef<"crypt", 'String'>
    readonly write_name: FieldRef<"crypt", 'String'>
  }
    

  // Custom InputTypes
  /**
   * crypt findUnique
   */
  export type cryptFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the crypt
     */
    select?: cryptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the crypt
     */
    omit?: cryptOmit<ExtArgs> | null
    /**
     * Filter, which crypt to fetch.
     */
    where: cryptWhereUniqueInput
  }

  /**
   * crypt findUniqueOrThrow
   */
  export type cryptFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the crypt
     */
    select?: cryptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the crypt
     */
    omit?: cryptOmit<ExtArgs> | null
    /**
     * Filter, which crypt to fetch.
     */
    where: cryptWhereUniqueInput
  }

  /**
   * crypt findFirst
   */
  export type cryptFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the crypt
     */
    select?: cryptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the crypt
     */
    omit?: cryptOmit<ExtArgs> | null
    /**
     * Filter, which crypt to fetch.
     */
    where?: cryptWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of crypts to fetch.
     */
    orderBy?: cryptOrderByWithRelationInput | cryptOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for crypts.
     */
    cursor?: cryptWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` crypts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` crypts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of crypts.
     */
    distinct?: CryptScalarFieldEnum | CryptScalarFieldEnum[]
  }

  /**
   * crypt findFirstOrThrow
   */
  export type cryptFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the crypt
     */
    select?: cryptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the crypt
     */
    omit?: cryptOmit<ExtArgs> | null
    /**
     * Filter, which crypt to fetch.
     */
    where?: cryptWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of crypts to fetch.
     */
    orderBy?: cryptOrderByWithRelationInput | cryptOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for crypts.
     */
    cursor?: cryptWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` crypts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` crypts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of crypts.
     */
    distinct?: CryptScalarFieldEnum | CryptScalarFieldEnum[]
  }

  /**
   * crypt findMany
   */
  export type cryptFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the crypt
     */
    select?: cryptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the crypt
     */
    omit?: cryptOmit<ExtArgs> | null
    /**
     * Filter, which crypts to fetch.
     */
    where?: cryptWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of crypts to fetch.
     */
    orderBy?: cryptOrderByWithRelationInput | cryptOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing crypts.
     */
    cursor?: cryptWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` crypts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` crypts.
     */
    skip?: number
    distinct?: CryptScalarFieldEnum | CryptScalarFieldEnum[]
  }

  /**
   * crypt create
   */
  export type cryptCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the crypt
     */
    select?: cryptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the crypt
     */
    omit?: cryptOmit<ExtArgs> | null
    /**
     * The data needed to create a crypt.
     */
    data: XOR<cryptCreateInput, cryptUncheckedCreateInput>
  }

  /**
   * crypt createMany
   */
  export type cryptCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many crypts.
     */
    data: cryptCreateManyInput | cryptCreateManyInput[]
  }

  /**
   * crypt createManyAndReturn
   */
  export type cryptCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the crypt
     */
    select?: cryptSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the crypt
     */
    omit?: cryptOmit<ExtArgs> | null
    /**
     * The data used to create many crypts.
     */
    data: cryptCreateManyInput | cryptCreateManyInput[]
  }

  /**
   * crypt update
   */
  export type cryptUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the crypt
     */
    select?: cryptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the crypt
     */
    omit?: cryptOmit<ExtArgs> | null
    /**
     * The data needed to update a crypt.
     */
    data: XOR<cryptUpdateInput, cryptUncheckedUpdateInput>
    /**
     * Choose, which crypt to update.
     */
    where: cryptWhereUniqueInput
  }

  /**
   * crypt updateMany
   */
  export type cryptUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update crypts.
     */
    data: XOR<cryptUpdateManyMutationInput, cryptUncheckedUpdateManyInput>
    /**
     * Filter which crypts to update
     */
    where?: cryptWhereInput
    /**
     * Limit how many crypts to update.
     */
    limit?: number
  }

  /**
   * crypt updateManyAndReturn
   */
  export type cryptUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the crypt
     */
    select?: cryptSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the crypt
     */
    omit?: cryptOmit<ExtArgs> | null
    /**
     * The data used to update crypts.
     */
    data: XOR<cryptUpdateManyMutationInput, cryptUncheckedUpdateManyInput>
    /**
     * Filter which crypts to update
     */
    where?: cryptWhereInput
    /**
     * Limit how many crypts to update.
     */
    limit?: number
  }

  /**
   * crypt upsert
   */
  export type cryptUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the crypt
     */
    select?: cryptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the crypt
     */
    omit?: cryptOmit<ExtArgs> | null
    /**
     * The filter to search for the crypt to update in case it exists.
     */
    where: cryptWhereUniqueInput
    /**
     * In case the crypt found by the `where` argument doesn't exist, create a new crypt with this data.
     */
    create: XOR<cryptCreateInput, cryptUncheckedCreateInput>
    /**
     * In case the crypt was found with the provided `where` argument, update it with this data.
     */
    update: XOR<cryptUpdateInput, cryptUncheckedUpdateInput>
  }

  /**
   * crypt delete
   */
  export type cryptDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the crypt
     */
    select?: cryptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the crypt
     */
    omit?: cryptOmit<ExtArgs> | null
    /**
     * Filter which crypt to delete.
     */
    where: cryptWhereUniqueInput
  }

  /**
   * crypt deleteMany
   */
  export type cryptDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which crypts to delete
     */
    where?: cryptWhereInput
    /**
     * Limit how many crypts to delete.
     */
    limit?: number
  }

  /**
   * crypt without action
   */
  export type cryptDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the crypt
     */
    select?: cryptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the crypt
     */
    omit?: cryptOmit<ExtArgs> | null
  }


  /**
   * Model mates
   */

  export type AggregateMates = {
    _count: MatesCountAggregateOutputType | null
    _avg: MatesAvgAggregateOutputType | null
    _sum: MatesSumAggregateOutputType | null
    _min: MatesMinAggregateOutputType | null
    _max: MatesMaxAggregateOutputType | null
  }

  export type MatesAvgAggregateOutputType = {
    mates_mask: number | null
    mates_user: number | null
    is_enabled: number | null
    dir_hidden: number | null
    dir_shared: number | null
    cache_time: number | null
  }

  export type MatesSumAggregateOutputType = {
    mates_mask: number | null
    mates_user: number | null
    is_enabled: number | null
    dir_hidden: number | null
    dir_shared: number | null
    cache_time: number | null
  }

  export type MatesMinAggregateOutputType = {
    mates_name: string | null
    mates_mask: number | null
    mates_user: number | null
    is_enabled: number | null
    dir_hidden: number | null
    dir_shared: number | null
    set_zipped: string | null
    set_parted: string | null
    crypt_name: string | null
    cache_time: number | null
  }

  export type MatesMaxAggregateOutputType = {
    mates_name: string | null
    mates_mask: number | null
    mates_user: number | null
    is_enabled: number | null
    dir_hidden: number | null
    dir_shared: number | null
    set_zipped: string | null
    set_parted: string | null
    crypt_name: string | null
    cache_time: number | null
  }

  export type MatesCountAggregateOutputType = {
    mates_name: number
    mates_mask: number
    mates_user: number
    is_enabled: number
    dir_hidden: number
    dir_shared: number
    set_zipped: number
    set_parted: number
    crypt_name: number
    cache_time: number
    _all: number
  }


  export type MatesAvgAggregateInputType = {
    mates_mask?: true
    mates_user?: true
    is_enabled?: true
    dir_hidden?: true
    dir_shared?: true
    cache_time?: true
  }

  export type MatesSumAggregateInputType = {
    mates_mask?: true
    mates_user?: true
    is_enabled?: true
    dir_hidden?: true
    dir_shared?: true
    cache_time?: true
  }

  export type MatesMinAggregateInputType = {
    mates_name?: true
    mates_mask?: true
    mates_user?: true
    is_enabled?: true
    dir_hidden?: true
    dir_shared?: true
    set_zipped?: true
    set_parted?: true
    crypt_name?: true
    cache_time?: true
  }

  export type MatesMaxAggregateInputType = {
    mates_name?: true
    mates_mask?: true
    mates_user?: true
    is_enabled?: true
    dir_hidden?: true
    dir_shared?: true
    set_zipped?: true
    set_parted?: true
    crypt_name?: true
    cache_time?: true
  }

  export type MatesCountAggregateInputType = {
    mates_name?: true
    mates_mask?: true
    mates_user?: true
    is_enabled?: true
    dir_hidden?: true
    dir_shared?: true
    set_zipped?: true
    set_parted?: true
    crypt_name?: true
    cache_time?: true
    _all?: true
  }

  export type MatesAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which mates to aggregate.
     */
    where?: matesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of mates to fetch.
     */
    orderBy?: matesOrderByWithRelationInput | matesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: matesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` mates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` mates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned mates
    **/
    _count?: true | MatesCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: MatesAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: MatesSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MatesMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MatesMaxAggregateInputType
  }

  export type GetMatesAggregateType<T extends MatesAggregateArgs> = {
        [P in keyof T & keyof AggregateMates]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMates[P]>
      : GetScalarType<T[P], AggregateMates[P]>
  }




  export type matesGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: matesWhereInput
    orderBy?: matesOrderByWithAggregationInput | matesOrderByWithAggregationInput[]
    by: MatesScalarFieldEnum[] | MatesScalarFieldEnum
    having?: matesScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MatesCountAggregateInputType | true
    _avg?: MatesAvgAggregateInputType
    _sum?: MatesSumAggregateInputType
    _min?: MatesMinAggregateInputType
    _max?: MatesMaxAggregateInputType
  }

  export type MatesGroupByOutputType = {
    mates_name: string
    mates_mask: number
    mates_user: number
    is_enabled: number
    dir_hidden: number | null
    dir_shared: number | null
    set_zipped: string | null
    set_parted: string | null
    crypt_name: string | null
    cache_time: number | null
    _count: MatesCountAggregateOutputType | null
    _avg: MatesAvgAggregateOutputType | null
    _sum: MatesSumAggregateOutputType | null
    _min: MatesMinAggregateOutputType | null
    _max: MatesMaxAggregateOutputType | null
  }

  type GetMatesGroupByPayload<T extends matesGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MatesGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MatesGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MatesGroupByOutputType[P]>
            : GetScalarType<T[P], MatesGroupByOutputType[P]>
        }
      >
    >


  export type matesSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    mates_name?: boolean
    mates_mask?: boolean
    mates_user?: boolean
    is_enabled?: boolean
    dir_hidden?: boolean
    dir_shared?: boolean
    set_zipped?: boolean
    set_parted?: boolean
    crypt_name?: boolean
    cache_time?: boolean
  }, ExtArgs["result"]["mates"]>

  export type matesSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    mates_name?: boolean
    mates_mask?: boolean
    mates_user?: boolean
    is_enabled?: boolean
    dir_hidden?: boolean
    dir_shared?: boolean
    set_zipped?: boolean
    set_parted?: boolean
    crypt_name?: boolean
    cache_time?: boolean
  }, ExtArgs["result"]["mates"]>

  export type matesSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    mates_name?: boolean
    mates_mask?: boolean
    mates_user?: boolean
    is_enabled?: boolean
    dir_hidden?: boolean
    dir_shared?: boolean
    set_zipped?: boolean
    set_parted?: boolean
    crypt_name?: boolean
    cache_time?: boolean
  }, ExtArgs["result"]["mates"]>

  export type matesSelectScalar = {
    mates_name?: boolean
    mates_mask?: boolean
    mates_user?: boolean
    is_enabled?: boolean
    dir_hidden?: boolean
    dir_shared?: boolean
    set_zipped?: boolean
    set_parted?: boolean
    crypt_name?: boolean
    cache_time?: boolean
  }

  export type matesOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"mates_name" | "mates_mask" | "mates_user" | "is_enabled" | "dir_hidden" | "dir_shared" | "set_zipped" | "set_parted" | "crypt_name" | "cache_time", ExtArgs["result"]["mates"]>

  export type $matesPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "mates"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      mates_name: string
      mates_mask: number
      mates_user: number
      is_enabled: number
      dir_hidden: number | null
      dir_shared: number | null
      set_zipped: string | null
      set_parted: string | null
      crypt_name: string | null
      cache_time: number | null
    }, ExtArgs["result"]["mates"]>
    composites: {}
  }

  type matesGetPayload<S extends boolean | null | undefined | matesDefaultArgs> = $Result.GetResult<Prisma.$matesPayload, S>

  type matesCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<matesFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: MatesCountAggregateInputType | true
    }

  export interface matesDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['mates'], meta: { name: 'mates' } }
    /**
     * Find zero or one Mates that matches the filter.
     * @param {matesFindUniqueArgs} args - Arguments to find a Mates
     * @example
     * // Get one Mates
     * const mates = await prisma.mates.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends matesFindUniqueArgs>(args: SelectSubset<T, matesFindUniqueArgs<ExtArgs>>): Prisma__matesClient<$Result.GetResult<Prisma.$matesPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Mates that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {matesFindUniqueOrThrowArgs} args - Arguments to find a Mates
     * @example
     * // Get one Mates
     * const mates = await prisma.mates.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends matesFindUniqueOrThrowArgs>(args: SelectSubset<T, matesFindUniqueOrThrowArgs<ExtArgs>>): Prisma__matesClient<$Result.GetResult<Prisma.$matesPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Mates that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {matesFindFirstArgs} args - Arguments to find a Mates
     * @example
     * // Get one Mates
     * const mates = await prisma.mates.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends matesFindFirstArgs>(args?: SelectSubset<T, matesFindFirstArgs<ExtArgs>>): Prisma__matesClient<$Result.GetResult<Prisma.$matesPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Mates that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {matesFindFirstOrThrowArgs} args - Arguments to find a Mates
     * @example
     * // Get one Mates
     * const mates = await prisma.mates.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends matesFindFirstOrThrowArgs>(args?: SelectSubset<T, matesFindFirstOrThrowArgs<ExtArgs>>): Prisma__matesClient<$Result.GetResult<Prisma.$matesPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Mates that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {matesFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Mates
     * const mates = await prisma.mates.findMany()
     * 
     * // Get first 10 Mates
     * const mates = await prisma.mates.findMany({ take: 10 })
     * 
     * // Only select the `mates_name`
     * const matesWithMates_nameOnly = await prisma.mates.findMany({ select: { mates_name: true } })
     * 
     */
    findMany<T extends matesFindManyArgs>(args?: SelectSubset<T, matesFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$matesPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Mates.
     * @param {matesCreateArgs} args - Arguments to create a Mates.
     * @example
     * // Create one Mates
     * const Mates = await prisma.mates.create({
     *   data: {
     *     // ... data to create a Mates
     *   }
     * })
     * 
     */
    create<T extends matesCreateArgs>(args: SelectSubset<T, matesCreateArgs<ExtArgs>>): Prisma__matesClient<$Result.GetResult<Prisma.$matesPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Mates.
     * @param {matesCreateManyArgs} args - Arguments to create many Mates.
     * @example
     * // Create many Mates
     * const mates = await prisma.mates.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends matesCreateManyArgs>(args?: SelectSubset<T, matesCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Mates and returns the data saved in the database.
     * @param {matesCreateManyAndReturnArgs} args - Arguments to create many Mates.
     * @example
     * // Create many Mates
     * const mates = await prisma.mates.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Mates and only return the `mates_name`
     * const matesWithMates_nameOnly = await prisma.mates.createManyAndReturn({
     *   select: { mates_name: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends matesCreateManyAndReturnArgs>(args?: SelectSubset<T, matesCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$matesPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Mates.
     * @param {matesDeleteArgs} args - Arguments to delete one Mates.
     * @example
     * // Delete one Mates
     * const Mates = await prisma.mates.delete({
     *   where: {
     *     // ... filter to delete one Mates
     *   }
     * })
     * 
     */
    delete<T extends matesDeleteArgs>(args: SelectSubset<T, matesDeleteArgs<ExtArgs>>): Prisma__matesClient<$Result.GetResult<Prisma.$matesPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Mates.
     * @param {matesUpdateArgs} args - Arguments to update one Mates.
     * @example
     * // Update one Mates
     * const mates = await prisma.mates.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends matesUpdateArgs>(args: SelectSubset<T, matesUpdateArgs<ExtArgs>>): Prisma__matesClient<$Result.GetResult<Prisma.$matesPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Mates.
     * @param {matesDeleteManyArgs} args - Arguments to filter Mates to delete.
     * @example
     * // Delete a few Mates
     * const { count } = await prisma.mates.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends matesDeleteManyArgs>(args?: SelectSubset<T, matesDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Mates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {matesUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Mates
     * const mates = await prisma.mates.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends matesUpdateManyArgs>(args: SelectSubset<T, matesUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Mates and returns the data updated in the database.
     * @param {matesUpdateManyAndReturnArgs} args - Arguments to update many Mates.
     * @example
     * // Update many Mates
     * const mates = await prisma.mates.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Mates and only return the `mates_name`
     * const matesWithMates_nameOnly = await prisma.mates.updateManyAndReturn({
     *   select: { mates_name: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends matesUpdateManyAndReturnArgs>(args: SelectSubset<T, matesUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$matesPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Mates.
     * @param {matesUpsertArgs} args - Arguments to update or create a Mates.
     * @example
     * // Update or create a Mates
     * const mates = await prisma.mates.upsert({
     *   create: {
     *     // ... data to create a Mates
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Mates we want to update
     *   }
     * })
     */
    upsert<T extends matesUpsertArgs>(args: SelectSubset<T, matesUpsertArgs<ExtArgs>>): Prisma__matesClient<$Result.GetResult<Prisma.$matesPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Mates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {matesCountArgs} args - Arguments to filter Mates to count.
     * @example
     * // Count the number of Mates
     * const count = await prisma.mates.count({
     *   where: {
     *     // ... the filter for the Mates we want to count
     *   }
     * })
    **/
    count<T extends matesCountArgs>(
      args?: Subset<T, matesCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MatesCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Mates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MatesAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends MatesAggregateArgs>(args: Subset<T, MatesAggregateArgs>): Prisma.PrismaPromise<GetMatesAggregateType<T>>

    /**
     * Group by Mates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {matesGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends matesGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: matesGroupByArgs['orderBy'] }
        : { orderBy?: matesGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, matesGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMatesGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the mates model
   */
  readonly fields: matesFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for mates.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__matesClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the mates model
   */
  interface matesFieldRefs {
    readonly mates_name: FieldRef<"mates", 'String'>
    readonly mates_mask: FieldRef<"mates", 'Int'>
    readonly mates_user: FieldRef<"mates", 'Int'>
    readonly is_enabled: FieldRef<"mates", 'Int'>
    readonly dir_hidden: FieldRef<"mates", 'Int'>
    readonly dir_shared: FieldRef<"mates", 'Int'>
    readonly set_zipped: FieldRef<"mates", 'String'>
    readonly set_parted: FieldRef<"mates", 'String'>
    readonly crypt_name: FieldRef<"mates", 'String'>
    readonly cache_time: FieldRef<"mates", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * mates findUnique
   */
  export type matesFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the mates
     */
    select?: matesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the mates
     */
    omit?: matesOmit<ExtArgs> | null
    /**
     * Filter, which mates to fetch.
     */
    where: matesWhereUniqueInput
  }

  /**
   * mates findUniqueOrThrow
   */
  export type matesFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the mates
     */
    select?: matesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the mates
     */
    omit?: matesOmit<ExtArgs> | null
    /**
     * Filter, which mates to fetch.
     */
    where: matesWhereUniqueInput
  }

  /**
   * mates findFirst
   */
  export type matesFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the mates
     */
    select?: matesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the mates
     */
    omit?: matesOmit<ExtArgs> | null
    /**
     * Filter, which mates to fetch.
     */
    where?: matesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of mates to fetch.
     */
    orderBy?: matesOrderByWithRelationInput | matesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for mates.
     */
    cursor?: matesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` mates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` mates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of mates.
     */
    distinct?: MatesScalarFieldEnum | MatesScalarFieldEnum[]
  }

  /**
   * mates findFirstOrThrow
   */
  export type matesFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the mates
     */
    select?: matesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the mates
     */
    omit?: matesOmit<ExtArgs> | null
    /**
     * Filter, which mates to fetch.
     */
    where?: matesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of mates to fetch.
     */
    orderBy?: matesOrderByWithRelationInput | matesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for mates.
     */
    cursor?: matesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` mates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` mates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of mates.
     */
    distinct?: MatesScalarFieldEnum | MatesScalarFieldEnum[]
  }

  /**
   * mates findMany
   */
  export type matesFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the mates
     */
    select?: matesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the mates
     */
    omit?: matesOmit<ExtArgs> | null
    /**
     * Filter, which mates to fetch.
     */
    where?: matesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of mates to fetch.
     */
    orderBy?: matesOrderByWithRelationInput | matesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing mates.
     */
    cursor?: matesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` mates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` mates.
     */
    skip?: number
    distinct?: MatesScalarFieldEnum | MatesScalarFieldEnum[]
  }

  /**
   * mates create
   */
  export type matesCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the mates
     */
    select?: matesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the mates
     */
    omit?: matesOmit<ExtArgs> | null
    /**
     * The data needed to create a mates.
     */
    data: XOR<matesCreateInput, matesUncheckedCreateInput>
  }

  /**
   * mates createMany
   */
  export type matesCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many mates.
     */
    data: matesCreateManyInput | matesCreateManyInput[]
  }

  /**
   * mates createManyAndReturn
   */
  export type matesCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the mates
     */
    select?: matesSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the mates
     */
    omit?: matesOmit<ExtArgs> | null
    /**
     * The data used to create many mates.
     */
    data: matesCreateManyInput | matesCreateManyInput[]
  }

  /**
   * mates update
   */
  export type matesUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the mates
     */
    select?: matesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the mates
     */
    omit?: matesOmit<ExtArgs> | null
    /**
     * The data needed to update a mates.
     */
    data: XOR<matesUpdateInput, matesUncheckedUpdateInput>
    /**
     * Choose, which mates to update.
     */
    where: matesWhereUniqueInput
  }

  /**
   * mates updateMany
   */
  export type matesUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update mates.
     */
    data: XOR<matesUpdateManyMutationInput, matesUncheckedUpdateManyInput>
    /**
     * Filter which mates to update
     */
    where?: matesWhereInput
    /**
     * Limit how many mates to update.
     */
    limit?: number
  }

  /**
   * mates updateManyAndReturn
   */
  export type matesUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the mates
     */
    select?: matesSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the mates
     */
    omit?: matesOmit<ExtArgs> | null
    /**
     * The data used to update mates.
     */
    data: XOR<matesUpdateManyMutationInput, matesUncheckedUpdateManyInput>
    /**
     * Filter which mates to update
     */
    where?: matesWhereInput
    /**
     * Limit how many mates to update.
     */
    limit?: number
  }

  /**
   * mates upsert
   */
  export type matesUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the mates
     */
    select?: matesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the mates
     */
    omit?: matesOmit<ExtArgs> | null
    /**
     * The filter to search for the mates to update in case it exists.
     */
    where: matesWhereUniqueInput
    /**
     * In case the mates found by the `where` argument doesn't exist, create a new mates with this data.
     */
    create: XOR<matesCreateInput, matesUncheckedCreateInput>
    /**
     * In case the mates was found with the provided `where` argument, update it with this data.
     */
    update: XOR<matesUpdateInput, matesUncheckedUpdateInput>
  }

  /**
   * mates delete
   */
  export type matesDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the mates
     */
    select?: matesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the mates
     */
    omit?: matesOmit<ExtArgs> | null
    /**
     * Filter which mates to delete.
     */
    where: matesWhereUniqueInput
  }

  /**
   * mates deleteMany
   */
  export type matesDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which mates to delete
     */
    where?: matesWhereInput
    /**
     * Limit how many mates to delete.
     */
    limit?: number
  }

  /**
   * mates without action
   */
  export type matesDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the mates
     */
    select?: matesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the mates
     */
    omit?: matesOmit<ExtArgs> | null
  }


  /**
   * Model share
   */

  export type AggregateShare = {
    _count: ShareCountAggregateOutputType | null
    _avg: ShareAvgAggregateOutputType | null
    _sum: ShareSumAggregateOutputType | null
    _min: ShareMinAggregateOutputType | null
    _max: ShareMaxAggregateOutputType | null
  }

  export type ShareAvgAggregateOutputType = {
    share_date: number | null
    share_ends: number | null
    is_enabled: number | null
  }

  export type ShareSumAggregateOutputType = {
    share_date: number | null
    share_ends: number | null
    is_enabled: number | null
  }

  export type ShareMinAggregateOutputType = {
    share_uuid: string | null
    share_path: string | null
    share_pass: string | null
    share_user: string | null
    share_date: number | null
    share_ends: number | null
    is_enabled: number | null
  }

  export type ShareMaxAggregateOutputType = {
    share_uuid: string | null
    share_path: string | null
    share_pass: string | null
    share_user: string | null
    share_date: number | null
    share_ends: number | null
    is_enabled: number | null
  }

  export type ShareCountAggregateOutputType = {
    share_uuid: number
    share_path: number
    share_pass: number
    share_user: number
    share_date: number
    share_ends: number
    is_enabled: number
    _all: number
  }


  export type ShareAvgAggregateInputType = {
    share_date?: true
    share_ends?: true
    is_enabled?: true
  }

  export type ShareSumAggregateInputType = {
    share_date?: true
    share_ends?: true
    is_enabled?: true
  }

  export type ShareMinAggregateInputType = {
    share_uuid?: true
    share_path?: true
    share_pass?: true
    share_user?: true
    share_date?: true
    share_ends?: true
    is_enabled?: true
  }

  export type ShareMaxAggregateInputType = {
    share_uuid?: true
    share_path?: true
    share_pass?: true
    share_user?: true
    share_date?: true
    share_ends?: true
    is_enabled?: true
  }

  export type ShareCountAggregateInputType = {
    share_uuid?: true
    share_path?: true
    share_pass?: true
    share_user?: true
    share_date?: true
    share_ends?: true
    is_enabled?: true
    _all?: true
  }

  export type ShareAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which share to aggregate.
     */
    where?: shareWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of shares to fetch.
     */
    orderBy?: shareOrderByWithRelationInput | shareOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: shareWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` shares from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` shares.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned shares
    **/
    _count?: true | ShareCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ShareAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ShareSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ShareMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ShareMaxAggregateInputType
  }

  export type GetShareAggregateType<T extends ShareAggregateArgs> = {
        [P in keyof T & keyof AggregateShare]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateShare[P]>
      : GetScalarType<T[P], AggregateShare[P]>
  }




  export type shareGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: shareWhereInput
    orderBy?: shareOrderByWithAggregationInput | shareOrderByWithAggregationInput[]
    by: ShareScalarFieldEnum[] | ShareScalarFieldEnum
    having?: shareScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ShareCountAggregateInputType | true
    _avg?: ShareAvgAggregateInputType
    _sum?: ShareSumAggregateInputType
    _min?: ShareMinAggregateInputType
    _max?: ShareMaxAggregateInputType
  }

  export type ShareGroupByOutputType = {
    share_uuid: string
    share_path: string
    share_pass: string
    share_user: string
    share_date: number
    share_ends: number
    is_enabled: number
    _count: ShareCountAggregateOutputType | null
    _avg: ShareAvgAggregateOutputType | null
    _sum: ShareSumAggregateOutputType | null
    _min: ShareMinAggregateOutputType | null
    _max: ShareMaxAggregateOutputType | null
  }

  type GetShareGroupByPayload<T extends shareGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ShareGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ShareGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ShareGroupByOutputType[P]>
            : GetScalarType<T[P], ShareGroupByOutputType[P]>
        }
      >
    >


  export type shareSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    share_uuid?: boolean
    share_path?: boolean
    share_pass?: boolean
    share_user?: boolean
    share_date?: boolean
    share_ends?: boolean
    is_enabled?: boolean
  }, ExtArgs["result"]["share"]>

  export type shareSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    share_uuid?: boolean
    share_path?: boolean
    share_pass?: boolean
    share_user?: boolean
    share_date?: boolean
    share_ends?: boolean
    is_enabled?: boolean
  }, ExtArgs["result"]["share"]>

  export type shareSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    share_uuid?: boolean
    share_path?: boolean
    share_pass?: boolean
    share_user?: boolean
    share_date?: boolean
    share_ends?: boolean
    is_enabled?: boolean
  }, ExtArgs["result"]["share"]>

  export type shareSelectScalar = {
    share_uuid?: boolean
    share_path?: boolean
    share_pass?: boolean
    share_user?: boolean
    share_date?: boolean
    share_ends?: boolean
    is_enabled?: boolean
  }

  export type shareOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"share_uuid" | "share_path" | "share_pass" | "share_user" | "share_date" | "share_ends" | "is_enabled", ExtArgs["result"]["share"]>

  export type $sharePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "share"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      share_uuid: string
      share_path: string
      share_pass: string
      share_user: string
      share_date: number
      share_ends: number
      is_enabled: number
    }, ExtArgs["result"]["share"]>
    composites: {}
  }

  type shareGetPayload<S extends boolean | null | undefined | shareDefaultArgs> = $Result.GetResult<Prisma.$sharePayload, S>

  type shareCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<shareFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ShareCountAggregateInputType | true
    }

  export interface shareDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['share'], meta: { name: 'share' } }
    /**
     * Find zero or one Share that matches the filter.
     * @param {shareFindUniqueArgs} args - Arguments to find a Share
     * @example
     * // Get one Share
     * const share = await prisma.share.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends shareFindUniqueArgs>(args: SelectSubset<T, shareFindUniqueArgs<ExtArgs>>): Prisma__shareClient<$Result.GetResult<Prisma.$sharePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Share that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {shareFindUniqueOrThrowArgs} args - Arguments to find a Share
     * @example
     * // Get one Share
     * const share = await prisma.share.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends shareFindUniqueOrThrowArgs>(args: SelectSubset<T, shareFindUniqueOrThrowArgs<ExtArgs>>): Prisma__shareClient<$Result.GetResult<Prisma.$sharePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Share that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {shareFindFirstArgs} args - Arguments to find a Share
     * @example
     * // Get one Share
     * const share = await prisma.share.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends shareFindFirstArgs>(args?: SelectSubset<T, shareFindFirstArgs<ExtArgs>>): Prisma__shareClient<$Result.GetResult<Prisma.$sharePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Share that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {shareFindFirstOrThrowArgs} args - Arguments to find a Share
     * @example
     * // Get one Share
     * const share = await prisma.share.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends shareFindFirstOrThrowArgs>(args?: SelectSubset<T, shareFindFirstOrThrowArgs<ExtArgs>>): Prisma__shareClient<$Result.GetResult<Prisma.$sharePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Shares that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {shareFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Shares
     * const shares = await prisma.share.findMany()
     * 
     * // Get first 10 Shares
     * const shares = await prisma.share.findMany({ take: 10 })
     * 
     * // Only select the `share_uuid`
     * const shareWithShare_uuidOnly = await prisma.share.findMany({ select: { share_uuid: true } })
     * 
     */
    findMany<T extends shareFindManyArgs>(args?: SelectSubset<T, shareFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$sharePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Share.
     * @param {shareCreateArgs} args - Arguments to create a Share.
     * @example
     * // Create one Share
     * const Share = await prisma.share.create({
     *   data: {
     *     // ... data to create a Share
     *   }
     * })
     * 
     */
    create<T extends shareCreateArgs>(args: SelectSubset<T, shareCreateArgs<ExtArgs>>): Prisma__shareClient<$Result.GetResult<Prisma.$sharePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Shares.
     * @param {shareCreateManyArgs} args - Arguments to create many Shares.
     * @example
     * // Create many Shares
     * const share = await prisma.share.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends shareCreateManyArgs>(args?: SelectSubset<T, shareCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Shares and returns the data saved in the database.
     * @param {shareCreateManyAndReturnArgs} args - Arguments to create many Shares.
     * @example
     * // Create many Shares
     * const share = await prisma.share.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Shares and only return the `share_uuid`
     * const shareWithShare_uuidOnly = await prisma.share.createManyAndReturn({
     *   select: { share_uuid: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends shareCreateManyAndReturnArgs>(args?: SelectSubset<T, shareCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$sharePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Share.
     * @param {shareDeleteArgs} args - Arguments to delete one Share.
     * @example
     * // Delete one Share
     * const Share = await prisma.share.delete({
     *   where: {
     *     // ... filter to delete one Share
     *   }
     * })
     * 
     */
    delete<T extends shareDeleteArgs>(args: SelectSubset<T, shareDeleteArgs<ExtArgs>>): Prisma__shareClient<$Result.GetResult<Prisma.$sharePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Share.
     * @param {shareUpdateArgs} args - Arguments to update one Share.
     * @example
     * // Update one Share
     * const share = await prisma.share.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends shareUpdateArgs>(args: SelectSubset<T, shareUpdateArgs<ExtArgs>>): Prisma__shareClient<$Result.GetResult<Prisma.$sharePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Shares.
     * @param {shareDeleteManyArgs} args - Arguments to filter Shares to delete.
     * @example
     * // Delete a few Shares
     * const { count } = await prisma.share.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends shareDeleteManyArgs>(args?: SelectSubset<T, shareDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Shares.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {shareUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Shares
     * const share = await prisma.share.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends shareUpdateManyArgs>(args: SelectSubset<T, shareUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Shares and returns the data updated in the database.
     * @param {shareUpdateManyAndReturnArgs} args - Arguments to update many Shares.
     * @example
     * // Update many Shares
     * const share = await prisma.share.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Shares and only return the `share_uuid`
     * const shareWithShare_uuidOnly = await prisma.share.updateManyAndReturn({
     *   select: { share_uuid: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends shareUpdateManyAndReturnArgs>(args: SelectSubset<T, shareUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$sharePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Share.
     * @param {shareUpsertArgs} args - Arguments to update or create a Share.
     * @example
     * // Update or create a Share
     * const share = await prisma.share.upsert({
     *   create: {
     *     // ... data to create a Share
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Share we want to update
     *   }
     * })
     */
    upsert<T extends shareUpsertArgs>(args: SelectSubset<T, shareUpsertArgs<ExtArgs>>): Prisma__shareClient<$Result.GetResult<Prisma.$sharePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Shares.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {shareCountArgs} args - Arguments to filter Shares to count.
     * @example
     * // Count the number of Shares
     * const count = await prisma.share.count({
     *   where: {
     *     // ... the filter for the Shares we want to count
     *   }
     * })
    **/
    count<T extends shareCountArgs>(
      args?: Subset<T, shareCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ShareCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Share.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShareAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ShareAggregateArgs>(args: Subset<T, ShareAggregateArgs>): Prisma.PrismaPromise<GetShareAggregateType<T>>

    /**
     * Group by Share.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {shareGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends shareGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: shareGroupByArgs['orderBy'] }
        : { orderBy?: shareGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, shareGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetShareGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the share model
   */
  readonly fields: shareFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for share.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__shareClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the share model
   */
  interface shareFieldRefs {
    readonly share_uuid: FieldRef<"share", 'String'>
    readonly share_path: FieldRef<"share", 'String'>
    readonly share_pass: FieldRef<"share", 'String'>
    readonly share_user: FieldRef<"share", 'String'>
    readonly share_date: FieldRef<"share", 'Int'>
    readonly share_ends: FieldRef<"share", 'Int'>
    readonly is_enabled: FieldRef<"share", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * share findUnique
   */
  export type shareFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the share
     */
    select?: shareSelect<ExtArgs> | null
    /**
     * Omit specific fields from the share
     */
    omit?: shareOmit<ExtArgs> | null
    /**
     * Filter, which share to fetch.
     */
    where: shareWhereUniqueInput
  }

  /**
   * share findUniqueOrThrow
   */
  export type shareFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the share
     */
    select?: shareSelect<ExtArgs> | null
    /**
     * Omit specific fields from the share
     */
    omit?: shareOmit<ExtArgs> | null
    /**
     * Filter, which share to fetch.
     */
    where: shareWhereUniqueInput
  }

  /**
   * share findFirst
   */
  export type shareFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the share
     */
    select?: shareSelect<ExtArgs> | null
    /**
     * Omit specific fields from the share
     */
    omit?: shareOmit<ExtArgs> | null
    /**
     * Filter, which share to fetch.
     */
    where?: shareWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of shares to fetch.
     */
    orderBy?: shareOrderByWithRelationInput | shareOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for shares.
     */
    cursor?: shareWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` shares from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` shares.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of shares.
     */
    distinct?: ShareScalarFieldEnum | ShareScalarFieldEnum[]
  }

  /**
   * share findFirstOrThrow
   */
  export type shareFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the share
     */
    select?: shareSelect<ExtArgs> | null
    /**
     * Omit specific fields from the share
     */
    omit?: shareOmit<ExtArgs> | null
    /**
     * Filter, which share to fetch.
     */
    where?: shareWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of shares to fetch.
     */
    orderBy?: shareOrderByWithRelationInput | shareOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for shares.
     */
    cursor?: shareWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` shares from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` shares.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of shares.
     */
    distinct?: ShareScalarFieldEnum | ShareScalarFieldEnum[]
  }

  /**
   * share findMany
   */
  export type shareFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the share
     */
    select?: shareSelect<ExtArgs> | null
    /**
     * Omit specific fields from the share
     */
    omit?: shareOmit<ExtArgs> | null
    /**
     * Filter, which shares to fetch.
     */
    where?: shareWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of shares to fetch.
     */
    orderBy?: shareOrderByWithRelationInput | shareOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing shares.
     */
    cursor?: shareWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` shares from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` shares.
     */
    skip?: number
    distinct?: ShareScalarFieldEnum | ShareScalarFieldEnum[]
  }

  /**
   * share create
   */
  export type shareCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the share
     */
    select?: shareSelect<ExtArgs> | null
    /**
     * Omit specific fields from the share
     */
    omit?: shareOmit<ExtArgs> | null
    /**
     * The data needed to create a share.
     */
    data: XOR<shareCreateInput, shareUncheckedCreateInput>
  }

  /**
   * share createMany
   */
  export type shareCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many shares.
     */
    data: shareCreateManyInput | shareCreateManyInput[]
  }

  /**
   * share createManyAndReturn
   */
  export type shareCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the share
     */
    select?: shareSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the share
     */
    omit?: shareOmit<ExtArgs> | null
    /**
     * The data used to create many shares.
     */
    data: shareCreateManyInput | shareCreateManyInput[]
  }

  /**
   * share update
   */
  export type shareUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the share
     */
    select?: shareSelect<ExtArgs> | null
    /**
     * Omit specific fields from the share
     */
    omit?: shareOmit<ExtArgs> | null
    /**
     * The data needed to update a share.
     */
    data: XOR<shareUpdateInput, shareUncheckedUpdateInput>
    /**
     * Choose, which share to update.
     */
    where: shareWhereUniqueInput
  }

  /**
   * share updateMany
   */
  export type shareUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update shares.
     */
    data: XOR<shareUpdateManyMutationInput, shareUncheckedUpdateManyInput>
    /**
     * Filter which shares to update
     */
    where?: shareWhereInput
    /**
     * Limit how many shares to update.
     */
    limit?: number
  }

  /**
   * share updateManyAndReturn
   */
  export type shareUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the share
     */
    select?: shareSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the share
     */
    omit?: shareOmit<ExtArgs> | null
    /**
     * The data used to update shares.
     */
    data: XOR<shareUpdateManyMutationInput, shareUncheckedUpdateManyInput>
    /**
     * Filter which shares to update
     */
    where?: shareWhereInput
    /**
     * Limit how many shares to update.
     */
    limit?: number
  }

  /**
   * share upsert
   */
  export type shareUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the share
     */
    select?: shareSelect<ExtArgs> | null
    /**
     * Omit specific fields from the share
     */
    omit?: shareOmit<ExtArgs> | null
    /**
     * The filter to search for the share to update in case it exists.
     */
    where: shareWhereUniqueInput
    /**
     * In case the share found by the `where` argument doesn't exist, create a new share with this data.
     */
    create: XOR<shareCreateInput, shareUncheckedCreateInput>
    /**
     * In case the share was found with the provided `where` argument, update it with this data.
     */
    update: XOR<shareUpdateInput, shareUncheckedUpdateInput>
  }

  /**
   * share delete
   */
  export type shareDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the share
     */
    select?: shareSelect<ExtArgs> | null
    /**
     * Omit specific fields from the share
     */
    omit?: shareOmit<ExtArgs> | null
    /**
     * Filter which share to delete.
     */
    where: shareWhereUniqueInput
  }

  /**
   * share deleteMany
   */
  export type shareDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which shares to delete
     */
    where?: shareWhereInput
    /**
     * Limit how many shares to delete.
     */
    limit?: number
  }

  /**
   * share without action
   */
  export type shareDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the share
     */
    select?: shareSelect<ExtArgs> | null
    /**
     * Omit specific fields from the share
     */
    omit?: shareOmit<ExtArgs> | null
  }


  /**
   * Model token
   */

  export type AggregateToken = {
    _count: TokenCountAggregateOutputType | null
    _avg: TokenAvgAggregateOutputType | null
    _sum: TokenSumAggregateOutputType | null
    _min: TokenMinAggregateOutputType | null
    _max: TokenMaxAggregateOutputType | null
  }

  export type TokenAvgAggregateOutputType = {
    is_enabled: number | null
  }

  export type TokenSumAggregateOutputType = {
    is_enabled: number | null
  }

  export type TokenMinAggregateOutputType = {
    token_uuid: string | null
    token_path: string | null
    token_user: string | null
    token_type: string | null
    token_info: string | null
    is_enabled: number | null
  }

  export type TokenMaxAggregateOutputType = {
    token_uuid: string | null
    token_path: string | null
    token_user: string | null
    token_type: string | null
    token_info: string | null
    is_enabled: number | null
  }

  export type TokenCountAggregateOutputType = {
    token_uuid: number
    token_path: number
    token_user: number
    token_type: number
    token_info: number
    is_enabled: number
    _all: number
  }


  export type TokenAvgAggregateInputType = {
    is_enabled?: true
  }

  export type TokenSumAggregateInputType = {
    is_enabled?: true
  }

  export type TokenMinAggregateInputType = {
    token_uuid?: true
    token_path?: true
    token_user?: true
    token_type?: true
    token_info?: true
    is_enabled?: true
  }

  export type TokenMaxAggregateInputType = {
    token_uuid?: true
    token_path?: true
    token_user?: true
    token_type?: true
    token_info?: true
    is_enabled?: true
  }

  export type TokenCountAggregateInputType = {
    token_uuid?: true
    token_path?: true
    token_user?: true
    token_type?: true
    token_info?: true
    is_enabled?: true
    _all?: true
  }

  export type TokenAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which token to aggregate.
     */
    where?: tokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of tokens to fetch.
     */
    orderBy?: tokenOrderByWithRelationInput | tokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: tokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` tokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` tokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned tokens
    **/
    _count?: true | TokenCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TokenAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TokenSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TokenMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TokenMaxAggregateInputType
  }

  export type GetTokenAggregateType<T extends TokenAggregateArgs> = {
        [P in keyof T & keyof AggregateToken]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateToken[P]>
      : GetScalarType<T[P], AggregateToken[P]>
  }




  export type tokenGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: tokenWhereInput
    orderBy?: tokenOrderByWithAggregationInput | tokenOrderByWithAggregationInput[]
    by: TokenScalarFieldEnum[] | TokenScalarFieldEnum
    having?: tokenScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TokenCountAggregateInputType | true
    _avg?: TokenAvgAggregateInputType
    _sum?: TokenSumAggregateInputType
    _min?: TokenMinAggregateInputType
    _max?: TokenMaxAggregateInputType
  }

  export type TokenGroupByOutputType = {
    token_uuid: string
    token_path: string
    token_user: string
    token_type: string
    token_info: string
    is_enabled: number
    _count: TokenCountAggregateOutputType | null
    _avg: TokenAvgAggregateOutputType | null
    _sum: TokenSumAggregateOutputType | null
    _min: TokenMinAggregateOutputType | null
    _max: TokenMaxAggregateOutputType | null
  }

  type GetTokenGroupByPayload<T extends tokenGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TokenGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TokenGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TokenGroupByOutputType[P]>
            : GetScalarType<T[P], TokenGroupByOutputType[P]>
        }
      >
    >


  export type tokenSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    token_uuid?: boolean
    token_path?: boolean
    token_user?: boolean
    token_type?: boolean
    token_info?: boolean
    is_enabled?: boolean
  }, ExtArgs["result"]["token"]>

  export type tokenSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    token_uuid?: boolean
    token_path?: boolean
    token_user?: boolean
    token_type?: boolean
    token_info?: boolean
    is_enabled?: boolean
  }, ExtArgs["result"]["token"]>

  export type tokenSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    token_uuid?: boolean
    token_path?: boolean
    token_user?: boolean
    token_type?: boolean
    token_info?: boolean
    is_enabled?: boolean
  }, ExtArgs["result"]["token"]>

  export type tokenSelectScalar = {
    token_uuid?: boolean
    token_path?: boolean
    token_user?: boolean
    token_type?: boolean
    token_info?: boolean
    is_enabled?: boolean
  }

  export type tokenOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"token_uuid" | "token_path" | "token_user" | "token_type" | "token_info" | "is_enabled", ExtArgs["result"]["token"]>

  export type $tokenPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "token"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      token_uuid: string
      token_path: string
      token_user: string
      token_type: string
      token_info: string
      is_enabled: number
    }, ExtArgs["result"]["token"]>
    composites: {}
  }

  type tokenGetPayload<S extends boolean | null | undefined | tokenDefaultArgs> = $Result.GetResult<Prisma.$tokenPayload, S>

  type tokenCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<tokenFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TokenCountAggregateInputType | true
    }

  export interface tokenDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['token'], meta: { name: 'token' } }
    /**
     * Find zero or one Token that matches the filter.
     * @param {tokenFindUniqueArgs} args - Arguments to find a Token
     * @example
     * // Get one Token
     * const token = await prisma.token.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends tokenFindUniqueArgs>(args: SelectSubset<T, tokenFindUniqueArgs<ExtArgs>>): Prisma__tokenClient<$Result.GetResult<Prisma.$tokenPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Token that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {tokenFindUniqueOrThrowArgs} args - Arguments to find a Token
     * @example
     * // Get one Token
     * const token = await prisma.token.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends tokenFindUniqueOrThrowArgs>(args: SelectSubset<T, tokenFindUniqueOrThrowArgs<ExtArgs>>): Prisma__tokenClient<$Result.GetResult<Prisma.$tokenPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Token that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {tokenFindFirstArgs} args - Arguments to find a Token
     * @example
     * // Get one Token
     * const token = await prisma.token.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends tokenFindFirstArgs>(args?: SelectSubset<T, tokenFindFirstArgs<ExtArgs>>): Prisma__tokenClient<$Result.GetResult<Prisma.$tokenPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Token that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {tokenFindFirstOrThrowArgs} args - Arguments to find a Token
     * @example
     * // Get one Token
     * const token = await prisma.token.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends tokenFindFirstOrThrowArgs>(args?: SelectSubset<T, tokenFindFirstOrThrowArgs<ExtArgs>>): Prisma__tokenClient<$Result.GetResult<Prisma.$tokenPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Tokens that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {tokenFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Tokens
     * const tokens = await prisma.token.findMany()
     * 
     * // Get first 10 Tokens
     * const tokens = await prisma.token.findMany({ take: 10 })
     * 
     * // Only select the `token_uuid`
     * const tokenWithToken_uuidOnly = await prisma.token.findMany({ select: { token_uuid: true } })
     * 
     */
    findMany<T extends tokenFindManyArgs>(args?: SelectSubset<T, tokenFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$tokenPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Token.
     * @param {tokenCreateArgs} args - Arguments to create a Token.
     * @example
     * // Create one Token
     * const Token = await prisma.token.create({
     *   data: {
     *     // ... data to create a Token
     *   }
     * })
     * 
     */
    create<T extends tokenCreateArgs>(args: SelectSubset<T, tokenCreateArgs<ExtArgs>>): Prisma__tokenClient<$Result.GetResult<Prisma.$tokenPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Tokens.
     * @param {tokenCreateManyArgs} args - Arguments to create many Tokens.
     * @example
     * // Create many Tokens
     * const token = await prisma.token.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends tokenCreateManyArgs>(args?: SelectSubset<T, tokenCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Tokens and returns the data saved in the database.
     * @param {tokenCreateManyAndReturnArgs} args - Arguments to create many Tokens.
     * @example
     * // Create many Tokens
     * const token = await prisma.token.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Tokens and only return the `token_uuid`
     * const tokenWithToken_uuidOnly = await prisma.token.createManyAndReturn({
     *   select: { token_uuid: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends tokenCreateManyAndReturnArgs>(args?: SelectSubset<T, tokenCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$tokenPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Token.
     * @param {tokenDeleteArgs} args - Arguments to delete one Token.
     * @example
     * // Delete one Token
     * const Token = await prisma.token.delete({
     *   where: {
     *     // ... filter to delete one Token
     *   }
     * })
     * 
     */
    delete<T extends tokenDeleteArgs>(args: SelectSubset<T, tokenDeleteArgs<ExtArgs>>): Prisma__tokenClient<$Result.GetResult<Prisma.$tokenPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Token.
     * @param {tokenUpdateArgs} args - Arguments to update one Token.
     * @example
     * // Update one Token
     * const token = await prisma.token.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends tokenUpdateArgs>(args: SelectSubset<T, tokenUpdateArgs<ExtArgs>>): Prisma__tokenClient<$Result.GetResult<Prisma.$tokenPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Tokens.
     * @param {tokenDeleteManyArgs} args - Arguments to filter Tokens to delete.
     * @example
     * // Delete a few Tokens
     * const { count } = await prisma.token.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends tokenDeleteManyArgs>(args?: SelectSubset<T, tokenDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Tokens.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {tokenUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Tokens
     * const token = await prisma.token.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends tokenUpdateManyArgs>(args: SelectSubset<T, tokenUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Tokens and returns the data updated in the database.
     * @param {tokenUpdateManyAndReturnArgs} args - Arguments to update many Tokens.
     * @example
     * // Update many Tokens
     * const token = await prisma.token.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Tokens and only return the `token_uuid`
     * const tokenWithToken_uuidOnly = await prisma.token.updateManyAndReturn({
     *   select: { token_uuid: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends tokenUpdateManyAndReturnArgs>(args: SelectSubset<T, tokenUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$tokenPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Token.
     * @param {tokenUpsertArgs} args - Arguments to update or create a Token.
     * @example
     * // Update or create a Token
     * const token = await prisma.token.upsert({
     *   create: {
     *     // ... data to create a Token
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Token we want to update
     *   }
     * })
     */
    upsert<T extends tokenUpsertArgs>(args: SelectSubset<T, tokenUpsertArgs<ExtArgs>>): Prisma__tokenClient<$Result.GetResult<Prisma.$tokenPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Tokens.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {tokenCountArgs} args - Arguments to filter Tokens to count.
     * @example
     * // Count the number of Tokens
     * const count = await prisma.token.count({
     *   where: {
     *     // ... the filter for the Tokens we want to count
     *   }
     * })
    **/
    count<T extends tokenCountArgs>(
      args?: Subset<T, tokenCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TokenCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Token.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TokenAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TokenAggregateArgs>(args: Subset<T, TokenAggregateArgs>): Prisma.PrismaPromise<GetTokenAggregateType<T>>

    /**
     * Group by Token.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {tokenGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends tokenGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: tokenGroupByArgs['orderBy'] }
        : { orderBy?: tokenGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, tokenGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTokenGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the token model
   */
  readonly fields: tokenFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for token.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__tokenClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the token model
   */
  interface tokenFieldRefs {
    readonly token_uuid: FieldRef<"token", 'String'>
    readonly token_path: FieldRef<"token", 'String'>
    readonly token_user: FieldRef<"token", 'String'>
    readonly token_type: FieldRef<"token", 'String'>
    readonly token_info: FieldRef<"token", 'String'>
    readonly is_enabled: FieldRef<"token", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * token findUnique
   */
  export type tokenFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the token
     */
    select?: tokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the token
     */
    omit?: tokenOmit<ExtArgs> | null
    /**
     * Filter, which token to fetch.
     */
    where: tokenWhereUniqueInput
  }

  /**
   * token findUniqueOrThrow
   */
  export type tokenFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the token
     */
    select?: tokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the token
     */
    omit?: tokenOmit<ExtArgs> | null
    /**
     * Filter, which token to fetch.
     */
    where: tokenWhereUniqueInput
  }

  /**
   * token findFirst
   */
  export type tokenFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the token
     */
    select?: tokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the token
     */
    omit?: tokenOmit<ExtArgs> | null
    /**
     * Filter, which token to fetch.
     */
    where?: tokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of tokens to fetch.
     */
    orderBy?: tokenOrderByWithRelationInput | tokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for tokens.
     */
    cursor?: tokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` tokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` tokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of tokens.
     */
    distinct?: TokenScalarFieldEnum | TokenScalarFieldEnum[]
  }

  /**
   * token findFirstOrThrow
   */
  export type tokenFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the token
     */
    select?: tokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the token
     */
    omit?: tokenOmit<ExtArgs> | null
    /**
     * Filter, which token to fetch.
     */
    where?: tokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of tokens to fetch.
     */
    orderBy?: tokenOrderByWithRelationInput | tokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for tokens.
     */
    cursor?: tokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` tokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` tokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of tokens.
     */
    distinct?: TokenScalarFieldEnum | TokenScalarFieldEnum[]
  }

  /**
   * token findMany
   */
  export type tokenFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the token
     */
    select?: tokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the token
     */
    omit?: tokenOmit<ExtArgs> | null
    /**
     * Filter, which tokens to fetch.
     */
    where?: tokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of tokens to fetch.
     */
    orderBy?: tokenOrderByWithRelationInput | tokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing tokens.
     */
    cursor?: tokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` tokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` tokens.
     */
    skip?: number
    distinct?: TokenScalarFieldEnum | TokenScalarFieldEnum[]
  }

  /**
   * token create
   */
  export type tokenCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the token
     */
    select?: tokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the token
     */
    omit?: tokenOmit<ExtArgs> | null
    /**
     * The data needed to create a token.
     */
    data: XOR<tokenCreateInput, tokenUncheckedCreateInput>
  }

  /**
   * token createMany
   */
  export type tokenCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many tokens.
     */
    data: tokenCreateManyInput | tokenCreateManyInput[]
  }

  /**
   * token createManyAndReturn
   */
  export type tokenCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the token
     */
    select?: tokenSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the token
     */
    omit?: tokenOmit<ExtArgs> | null
    /**
     * The data used to create many tokens.
     */
    data: tokenCreateManyInput | tokenCreateManyInput[]
  }

  /**
   * token update
   */
  export type tokenUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the token
     */
    select?: tokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the token
     */
    omit?: tokenOmit<ExtArgs> | null
    /**
     * The data needed to update a token.
     */
    data: XOR<tokenUpdateInput, tokenUncheckedUpdateInput>
    /**
     * Choose, which token to update.
     */
    where: tokenWhereUniqueInput
  }

  /**
   * token updateMany
   */
  export type tokenUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update tokens.
     */
    data: XOR<tokenUpdateManyMutationInput, tokenUncheckedUpdateManyInput>
    /**
     * Filter which tokens to update
     */
    where?: tokenWhereInput
    /**
     * Limit how many tokens to update.
     */
    limit?: number
  }

  /**
   * token updateManyAndReturn
   */
  export type tokenUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the token
     */
    select?: tokenSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the token
     */
    omit?: tokenOmit<ExtArgs> | null
    /**
     * The data used to update tokens.
     */
    data: XOR<tokenUpdateManyMutationInput, tokenUncheckedUpdateManyInput>
    /**
     * Filter which tokens to update
     */
    where?: tokenWhereInput
    /**
     * Limit how many tokens to update.
     */
    limit?: number
  }

  /**
   * token upsert
   */
  export type tokenUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the token
     */
    select?: tokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the token
     */
    omit?: tokenOmit<ExtArgs> | null
    /**
     * The filter to search for the token to update in case it exists.
     */
    where: tokenWhereUniqueInput
    /**
     * In case the token found by the `where` argument doesn't exist, create a new token with this data.
     */
    create: XOR<tokenCreateInput, tokenUncheckedCreateInput>
    /**
     * In case the token was found with the provided `where` argument, update it with this data.
     */
    update: XOR<tokenUpdateInput, tokenUncheckedUpdateInput>
  }

  /**
   * token delete
   */
  export type tokenDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the token
     */
    select?: tokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the token
     */
    omit?: tokenOmit<ExtArgs> | null
    /**
     * Filter which token to delete.
     */
    where: tokenWhereUniqueInput
  }

  /**
   * token deleteMany
   */
  export type tokenDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which tokens to delete
     */
    where?: tokenWhereInput
    /**
     * Limit how many tokens to delete.
     */
    limit?: number
  }

  /**
   * token without action
   */
  export type tokenDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the token
     */
    select?: tokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the token
     */
    omit?: tokenOmit<ExtArgs> | null
  }


  /**
   * Model tasks
   */

  export type AggregateTasks = {
    _count: TasksCountAggregateOutputType | null
    _avg: TasksAvgAggregateOutputType | null
    _sum: TasksSumAggregateOutputType | null
    _min: TasksMinAggregateOutputType | null
    _max: TasksMaxAggregateOutputType | null
  }

  export type TasksAvgAggregateOutputType = {
    tasks_flag: number | null
  }

  export type TasksSumAggregateOutputType = {
    tasks_flag: number | null
  }

  export type TasksMinAggregateOutputType = {
    tasks_uuid: string | null
    tasks_type: string | null
    tasks_user: string | null
    tasks_info: string | null
    tasks_flag: number | null
  }

  export type TasksMaxAggregateOutputType = {
    tasks_uuid: string | null
    tasks_type: string | null
    tasks_user: string | null
    tasks_info: string | null
    tasks_flag: number | null
  }

  export type TasksCountAggregateOutputType = {
    tasks_uuid: number
    tasks_type: number
    tasks_user: number
    tasks_info: number
    tasks_flag: number
    _all: number
  }


  export type TasksAvgAggregateInputType = {
    tasks_flag?: true
  }

  export type TasksSumAggregateInputType = {
    tasks_flag?: true
  }

  export type TasksMinAggregateInputType = {
    tasks_uuid?: true
    tasks_type?: true
    tasks_user?: true
    tasks_info?: true
    tasks_flag?: true
  }

  export type TasksMaxAggregateInputType = {
    tasks_uuid?: true
    tasks_type?: true
    tasks_user?: true
    tasks_info?: true
    tasks_flag?: true
  }

  export type TasksCountAggregateInputType = {
    tasks_uuid?: true
    tasks_type?: true
    tasks_user?: true
    tasks_info?: true
    tasks_flag?: true
    _all?: true
  }

  export type TasksAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which tasks to aggregate.
     */
    where?: tasksWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of tasks to fetch.
     */
    orderBy?: tasksOrderByWithRelationInput | tasksOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: tasksWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` tasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` tasks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned tasks
    **/
    _count?: true | TasksCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TasksAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TasksSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TasksMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TasksMaxAggregateInputType
  }

  export type GetTasksAggregateType<T extends TasksAggregateArgs> = {
        [P in keyof T & keyof AggregateTasks]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTasks[P]>
      : GetScalarType<T[P], AggregateTasks[P]>
  }




  export type tasksGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: tasksWhereInput
    orderBy?: tasksOrderByWithAggregationInput | tasksOrderByWithAggregationInput[]
    by: TasksScalarFieldEnum[] | TasksScalarFieldEnum
    having?: tasksScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TasksCountAggregateInputType | true
    _avg?: TasksAvgAggregateInputType
    _sum?: TasksSumAggregateInputType
    _min?: TasksMinAggregateInputType
    _max?: TasksMaxAggregateInputType
  }

  export type TasksGroupByOutputType = {
    tasks_uuid: string
    tasks_type: string
    tasks_user: string
    tasks_info: string
    tasks_flag: number
    _count: TasksCountAggregateOutputType | null
    _avg: TasksAvgAggregateOutputType | null
    _sum: TasksSumAggregateOutputType | null
    _min: TasksMinAggregateOutputType | null
    _max: TasksMaxAggregateOutputType | null
  }

  type GetTasksGroupByPayload<T extends tasksGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TasksGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TasksGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TasksGroupByOutputType[P]>
            : GetScalarType<T[P], TasksGroupByOutputType[P]>
        }
      >
    >


  export type tasksSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    tasks_uuid?: boolean
    tasks_type?: boolean
    tasks_user?: boolean
    tasks_info?: boolean
    tasks_flag?: boolean
  }, ExtArgs["result"]["tasks"]>

  export type tasksSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    tasks_uuid?: boolean
    tasks_type?: boolean
    tasks_user?: boolean
    tasks_info?: boolean
    tasks_flag?: boolean
  }, ExtArgs["result"]["tasks"]>

  export type tasksSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    tasks_uuid?: boolean
    tasks_type?: boolean
    tasks_user?: boolean
    tasks_info?: boolean
    tasks_flag?: boolean
  }, ExtArgs["result"]["tasks"]>

  export type tasksSelectScalar = {
    tasks_uuid?: boolean
    tasks_type?: boolean
    tasks_user?: boolean
    tasks_info?: boolean
    tasks_flag?: boolean
  }

  export type tasksOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"tasks_uuid" | "tasks_type" | "tasks_user" | "tasks_info" | "tasks_flag", ExtArgs["result"]["tasks"]>

  export type $tasksPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "tasks"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      tasks_uuid: string
      tasks_type: string
      tasks_user: string
      tasks_info: string
      tasks_flag: number
    }, ExtArgs["result"]["tasks"]>
    composites: {}
  }

  type tasksGetPayload<S extends boolean | null | undefined | tasksDefaultArgs> = $Result.GetResult<Prisma.$tasksPayload, S>

  type tasksCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<tasksFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TasksCountAggregateInputType | true
    }

  export interface tasksDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['tasks'], meta: { name: 'tasks' } }
    /**
     * Find zero or one Tasks that matches the filter.
     * @param {tasksFindUniqueArgs} args - Arguments to find a Tasks
     * @example
     * // Get one Tasks
     * const tasks = await prisma.tasks.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends tasksFindUniqueArgs>(args: SelectSubset<T, tasksFindUniqueArgs<ExtArgs>>): Prisma__tasksClient<$Result.GetResult<Prisma.$tasksPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Tasks that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {tasksFindUniqueOrThrowArgs} args - Arguments to find a Tasks
     * @example
     * // Get one Tasks
     * const tasks = await prisma.tasks.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends tasksFindUniqueOrThrowArgs>(args: SelectSubset<T, tasksFindUniqueOrThrowArgs<ExtArgs>>): Prisma__tasksClient<$Result.GetResult<Prisma.$tasksPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Tasks that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {tasksFindFirstArgs} args - Arguments to find a Tasks
     * @example
     * // Get one Tasks
     * const tasks = await prisma.tasks.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends tasksFindFirstArgs>(args?: SelectSubset<T, tasksFindFirstArgs<ExtArgs>>): Prisma__tasksClient<$Result.GetResult<Prisma.$tasksPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Tasks that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {tasksFindFirstOrThrowArgs} args - Arguments to find a Tasks
     * @example
     * // Get one Tasks
     * const tasks = await prisma.tasks.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends tasksFindFirstOrThrowArgs>(args?: SelectSubset<T, tasksFindFirstOrThrowArgs<ExtArgs>>): Prisma__tasksClient<$Result.GetResult<Prisma.$tasksPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Tasks that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {tasksFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Tasks
     * const tasks = await prisma.tasks.findMany()
     * 
     * // Get first 10 Tasks
     * const tasks = await prisma.tasks.findMany({ take: 10 })
     * 
     * // Only select the `tasks_uuid`
     * const tasksWithTasks_uuidOnly = await prisma.tasks.findMany({ select: { tasks_uuid: true } })
     * 
     */
    findMany<T extends tasksFindManyArgs>(args?: SelectSubset<T, tasksFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$tasksPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Tasks.
     * @param {tasksCreateArgs} args - Arguments to create a Tasks.
     * @example
     * // Create one Tasks
     * const Tasks = await prisma.tasks.create({
     *   data: {
     *     // ... data to create a Tasks
     *   }
     * })
     * 
     */
    create<T extends tasksCreateArgs>(args: SelectSubset<T, tasksCreateArgs<ExtArgs>>): Prisma__tasksClient<$Result.GetResult<Prisma.$tasksPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Tasks.
     * @param {tasksCreateManyArgs} args - Arguments to create many Tasks.
     * @example
     * // Create many Tasks
     * const tasks = await prisma.tasks.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends tasksCreateManyArgs>(args?: SelectSubset<T, tasksCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Tasks and returns the data saved in the database.
     * @param {tasksCreateManyAndReturnArgs} args - Arguments to create many Tasks.
     * @example
     * // Create many Tasks
     * const tasks = await prisma.tasks.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Tasks and only return the `tasks_uuid`
     * const tasksWithTasks_uuidOnly = await prisma.tasks.createManyAndReturn({
     *   select: { tasks_uuid: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends tasksCreateManyAndReturnArgs>(args?: SelectSubset<T, tasksCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$tasksPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Tasks.
     * @param {tasksDeleteArgs} args - Arguments to delete one Tasks.
     * @example
     * // Delete one Tasks
     * const Tasks = await prisma.tasks.delete({
     *   where: {
     *     // ... filter to delete one Tasks
     *   }
     * })
     * 
     */
    delete<T extends tasksDeleteArgs>(args: SelectSubset<T, tasksDeleteArgs<ExtArgs>>): Prisma__tasksClient<$Result.GetResult<Prisma.$tasksPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Tasks.
     * @param {tasksUpdateArgs} args - Arguments to update one Tasks.
     * @example
     * // Update one Tasks
     * const tasks = await prisma.tasks.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends tasksUpdateArgs>(args: SelectSubset<T, tasksUpdateArgs<ExtArgs>>): Prisma__tasksClient<$Result.GetResult<Prisma.$tasksPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Tasks.
     * @param {tasksDeleteManyArgs} args - Arguments to filter Tasks to delete.
     * @example
     * // Delete a few Tasks
     * const { count } = await prisma.tasks.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends tasksDeleteManyArgs>(args?: SelectSubset<T, tasksDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Tasks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {tasksUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Tasks
     * const tasks = await prisma.tasks.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends tasksUpdateManyArgs>(args: SelectSubset<T, tasksUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Tasks and returns the data updated in the database.
     * @param {tasksUpdateManyAndReturnArgs} args - Arguments to update many Tasks.
     * @example
     * // Update many Tasks
     * const tasks = await prisma.tasks.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Tasks and only return the `tasks_uuid`
     * const tasksWithTasks_uuidOnly = await prisma.tasks.updateManyAndReturn({
     *   select: { tasks_uuid: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends tasksUpdateManyAndReturnArgs>(args: SelectSubset<T, tasksUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$tasksPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Tasks.
     * @param {tasksUpsertArgs} args - Arguments to update or create a Tasks.
     * @example
     * // Update or create a Tasks
     * const tasks = await prisma.tasks.upsert({
     *   create: {
     *     // ... data to create a Tasks
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Tasks we want to update
     *   }
     * })
     */
    upsert<T extends tasksUpsertArgs>(args: SelectSubset<T, tasksUpsertArgs<ExtArgs>>): Prisma__tasksClient<$Result.GetResult<Prisma.$tasksPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Tasks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {tasksCountArgs} args - Arguments to filter Tasks to count.
     * @example
     * // Count the number of Tasks
     * const count = await prisma.tasks.count({
     *   where: {
     *     // ... the filter for the Tasks we want to count
     *   }
     * })
    **/
    count<T extends tasksCountArgs>(
      args?: Subset<T, tasksCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TasksCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Tasks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TasksAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TasksAggregateArgs>(args: Subset<T, TasksAggregateArgs>): Prisma.PrismaPromise<GetTasksAggregateType<T>>

    /**
     * Group by Tasks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {tasksGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends tasksGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: tasksGroupByArgs['orderBy'] }
        : { orderBy?: tasksGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, tasksGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTasksGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the tasks model
   */
  readonly fields: tasksFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for tasks.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__tasksClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the tasks model
   */
  interface tasksFieldRefs {
    readonly tasks_uuid: FieldRef<"tasks", 'String'>
    readonly tasks_type: FieldRef<"tasks", 'String'>
    readonly tasks_user: FieldRef<"tasks", 'String'>
    readonly tasks_info: FieldRef<"tasks", 'String'>
    readonly tasks_flag: FieldRef<"tasks", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * tasks findUnique
   */
  export type tasksFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the tasks
     */
    select?: tasksSelect<ExtArgs> | null
    /**
     * Omit specific fields from the tasks
     */
    omit?: tasksOmit<ExtArgs> | null
    /**
     * Filter, which tasks to fetch.
     */
    where: tasksWhereUniqueInput
  }

  /**
   * tasks findUniqueOrThrow
   */
  export type tasksFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the tasks
     */
    select?: tasksSelect<ExtArgs> | null
    /**
     * Omit specific fields from the tasks
     */
    omit?: tasksOmit<ExtArgs> | null
    /**
     * Filter, which tasks to fetch.
     */
    where: tasksWhereUniqueInput
  }

  /**
   * tasks findFirst
   */
  export type tasksFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the tasks
     */
    select?: tasksSelect<ExtArgs> | null
    /**
     * Omit specific fields from the tasks
     */
    omit?: tasksOmit<ExtArgs> | null
    /**
     * Filter, which tasks to fetch.
     */
    where?: tasksWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of tasks to fetch.
     */
    orderBy?: tasksOrderByWithRelationInput | tasksOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for tasks.
     */
    cursor?: tasksWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` tasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` tasks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of tasks.
     */
    distinct?: TasksScalarFieldEnum | TasksScalarFieldEnum[]
  }

  /**
   * tasks findFirstOrThrow
   */
  export type tasksFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the tasks
     */
    select?: tasksSelect<ExtArgs> | null
    /**
     * Omit specific fields from the tasks
     */
    omit?: tasksOmit<ExtArgs> | null
    /**
     * Filter, which tasks to fetch.
     */
    where?: tasksWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of tasks to fetch.
     */
    orderBy?: tasksOrderByWithRelationInput | tasksOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for tasks.
     */
    cursor?: tasksWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` tasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` tasks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of tasks.
     */
    distinct?: TasksScalarFieldEnum | TasksScalarFieldEnum[]
  }

  /**
   * tasks findMany
   */
  export type tasksFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the tasks
     */
    select?: tasksSelect<ExtArgs> | null
    /**
     * Omit specific fields from the tasks
     */
    omit?: tasksOmit<ExtArgs> | null
    /**
     * Filter, which tasks to fetch.
     */
    where?: tasksWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of tasks to fetch.
     */
    orderBy?: tasksOrderByWithRelationInput | tasksOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing tasks.
     */
    cursor?: tasksWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` tasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` tasks.
     */
    skip?: number
    distinct?: TasksScalarFieldEnum | TasksScalarFieldEnum[]
  }

  /**
   * tasks create
   */
  export type tasksCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the tasks
     */
    select?: tasksSelect<ExtArgs> | null
    /**
     * Omit specific fields from the tasks
     */
    omit?: tasksOmit<ExtArgs> | null
    /**
     * The data needed to create a tasks.
     */
    data: XOR<tasksCreateInput, tasksUncheckedCreateInput>
  }

  /**
   * tasks createMany
   */
  export type tasksCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many tasks.
     */
    data: tasksCreateManyInput | tasksCreateManyInput[]
  }

  /**
   * tasks createManyAndReturn
   */
  export type tasksCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the tasks
     */
    select?: tasksSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the tasks
     */
    omit?: tasksOmit<ExtArgs> | null
    /**
     * The data used to create many tasks.
     */
    data: tasksCreateManyInput | tasksCreateManyInput[]
  }

  /**
   * tasks update
   */
  export type tasksUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the tasks
     */
    select?: tasksSelect<ExtArgs> | null
    /**
     * Omit specific fields from the tasks
     */
    omit?: tasksOmit<ExtArgs> | null
    /**
     * The data needed to update a tasks.
     */
    data: XOR<tasksUpdateInput, tasksUncheckedUpdateInput>
    /**
     * Choose, which tasks to update.
     */
    where: tasksWhereUniqueInput
  }

  /**
   * tasks updateMany
   */
  export type tasksUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update tasks.
     */
    data: XOR<tasksUpdateManyMutationInput, tasksUncheckedUpdateManyInput>
    /**
     * Filter which tasks to update
     */
    where?: tasksWhereInput
    /**
     * Limit how many tasks to update.
     */
    limit?: number
  }

  /**
   * tasks updateManyAndReturn
   */
  export type tasksUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the tasks
     */
    select?: tasksSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the tasks
     */
    omit?: tasksOmit<ExtArgs> | null
    /**
     * The data used to update tasks.
     */
    data: XOR<tasksUpdateManyMutationInput, tasksUncheckedUpdateManyInput>
    /**
     * Filter which tasks to update
     */
    where?: tasksWhereInput
    /**
     * Limit how many tasks to update.
     */
    limit?: number
  }

  /**
   * tasks upsert
   */
  export type tasksUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the tasks
     */
    select?: tasksSelect<ExtArgs> | null
    /**
     * Omit specific fields from the tasks
     */
    omit?: tasksOmit<ExtArgs> | null
    /**
     * The filter to search for the tasks to update in case it exists.
     */
    where: tasksWhereUniqueInput
    /**
     * In case the tasks found by the `where` argument doesn't exist, create a new tasks with this data.
     */
    create: XOR<tasksCreateInput, tasksUncheckedCreateInput>
    /**
     * In case the tasks was found with the provided `where` argument, update it with this data.
     */
    update: XOR<tasksUpdateInput, tasksUncheckedUpdateInput>
  }

  /**
   * tasks delete
   */
  export type tasksDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the tasks
     */
    select?: tasksSelect<ExtArgs> | null
    /**
     * Omit specific fields from the tasks
     */
    omit?: tasksOmit<ExtArgs> | null
    /**
     * Filter which tasks to delete.
     */
    where: tasksWhereUniqueInput
  }

  /**
   * tasks deleteMany
   */
  export type tasksDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which tasks to delete
     */
    where?: tasksWhereInput
    /**
     * Limit how many tasks to delete.
     */
    limit?: number
  }

  /**
   * tasks without action
   */
  export type tasksDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the tasks
     */
    select?: tasksSelect<ExtArgs> | null
    /**
     * Omit specific fields from the tasks
     */
    omit?: tasksOmit<ExtArgs> | null
  }


  /**
   * Model fetch
   */

  export type AggregateFetch = {
    _count: FetchCountAggregateOutputType | null
    _avg: FetchAvgAggregateOutputType | null
    _sum: FetchSumAggregateOutputType | null
    _min: FetchMinAggregateOutputType | null
    _max: FetchMaxAggregateOutputType | null
  }

  export type FetchAvgAggregateOutputType = {
    fetch_flag: number | null
  }

  export type FetchSumAggregateOutputType = {
    fetch_flag: number | null
  }

  export type FetchMinAggregateOutputType = {
    fetch_uuid: string | null
    fetch_from: string | null
    fetch_dest: string | null
    fetch_user: string | null
    fetch_flag: number | null
  }

  export type FetchMaxAggregateOutputType = {
    fetch_uuid: string | null
    fetch_from: string | null
    fetch_dest: string | null
    fetch_user: string | null
    fetch_flag: number | null
  }

  export type FetchCountAggregateOutputType = {
    fetch_uuid: number
    fetch_from: number
    fetch_dest: number
    fetch_user: number
    fetch_flag: number
    _all: number
  }


  export type FetchAvgAggregateInputType = {
    fetch_flag?: true
  }

  export type FetchSumAggregateInputType = {
    fetch_flag?: true
  }

  export type FetchMinAggregateInputType = {
    fetch_uuid?: true
    fetch_from?: true
    fetch_dest?: true
    fetch_user?: true
    fetch_flag?: true
  }

  export type FetchMaxAggregateInputType = {
    fetch_uuid?: true
    fetch_from?: true
    fetch_dest?: true
    fetch_user?: true
    fetch_flag?: true
  }

  export type FetchCountAggregateInputType = {
    fetch_uuid?: true
    fetch_from?: true
    fetch_dest?: true
    fetch_user?: true
    fetch_flag?: true
    _all?: true
  }

  export type FetchAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which fetch to aggregate.
     */
    where?: fetchWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of fetches to fetch.
     */
    orderBy?: fetchOrderByWithRelationInput | fetchOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: fetchWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` fetches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` fetches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned fetches
    **/
    _count?: true | FetchCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: FetchAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: FetchSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: FetchMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: FetchMaxAggregateInputType
  }

  export type GetFetchAggregateType<T extends FetchAggregateArgs> = {
        [P in keyof T & keyof AggregateFetch]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateFetch[P]>
      : GetScalarType<T[P], AggregateFetch[P]>
  }




  export type fetchGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: fetchWhereInput
    orderBy?: fetchOrderByWithAggregationInput | fetchOrderByWithAggregationInput[]
    by: FetchScalarFieldEnum[] | FetchScalarFieldEnum
    having?: fetchScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: FetchCountAggregateInputType | true
    _avg?: FetchAvgAggregateInputType
    _sum?: FetchSumAggregateInputType
    _min?: FetchMinAggregateInputType
    _max?: FetchMaxAggregateInputType
  }

  export type FetchGroupByOutputType = {
    fetch_uuid: string
    fetch_from: string
    fetch_dest: string
    fetch_user: string
    fetch_flag: number
    _count: FetchCountAggregateOutputType | null
    _avg: FetchAvgAggregateOutputType | null
    _sum: FetchSumAggregateOutputType | null
    _min: FetchMinAggregateOutputType | null
    _max: FetchMaxAggregateOutputType | null
  }

  type GetFetchGroupByPayload<T extends fetchGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<FetchGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof FetchGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], FetchGroupByOutputType[P]>
            : GetScalarType<T[P], FetchGroupByOutputType[P]>
        }
      >
    >


  export type fetchSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    fetch_uuid?: boolean
    fetch_from?: boolean
    fetch_dest?: boolean
    fetch_user?: boolean
    fetch_flag?: boolean
  }, ExtArgs["result"]["fetch"]>

  export type fetchSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    fetch_uuid?: boolean
    fetch_from?: boolean
    fetch_dest?: boolean
    fetch_user?: boolean
    fetch_flag?: boolean
  }, ExtArgs["result"]["fetch"]>

  export type fetchSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    fetch_uuid?: boolean
    fetch_from?: boolean
    fetch_dest?: boolean
    fetch_user?: boolean
    fetch_flag?: boolean
  }, ExtArgs["result"]["fetch"]>

  export type fetchSelectScalar = {
    fetch_uuid?: boolean
    fetch_from?: boolean
    fetch_dest?: boolean
    fetch_user?: boolean
    fetch_flag?: boolean
  }

  export type fetchOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"fetch_uuid" | "fetch_from" | "fetch_dest" | "fetch_user" | "fetch_flag", ExtArgs["result"]["fetch"]>

  export type $fetchPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "fetch"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      fetch_uuid: string
      fetch_from: string
      fetch_dest: string
      fetch_user: string
      fetch_flag: number
    }, ExtArgs["result"]["fetch"]>
    composites: {}
  }

  type fetchGetPayload<S extends boolean | null | undefined | fetchDefaultArgs> = $Result.GetResult<Prisma.$fetchPayload, S>

  type fetchCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<fetchFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: FetchCountAggregateInputType | true
    }

  export interface fetchDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['fetch'], meta: { name: 'fetch' } }
    /**
     * Find zero or one Fetch that matches the filter.
     * @param {fetchFindUniqueArgs} args - Arguments to find a Fetch
     * @example
     * // Get one Fetch
     * const fetch = await prisma.fetch.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends fetchFindUniqueArgs>(args: SelectSubset<T, fetchFindUniqueArgs<ExtArgs>>): Prisma__fetchClient<$Result.GetResult<Prisma.$fetchPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Fetch that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {fetchFindUniqueOrThrowArgs} args - Arguments to find a Fetch
     * @example
     * // Get one Fetch
     * const fetch = await prisma.fetch.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends fetchFindUniqueOrThrowArgs>(args: SelectSubset<T, fetchFindUniqueOrThrowArgs<ExtArgs>>): Prisma__fetchClient<$Result.GetResult<Prisma.$fetchPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Fetch that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {fetchFindFirstArgs} args - Arguments to find a Fetch
     * @example
     * // Get one Fetch
     * const fetch = await prisma.fetch.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends fetchFindFirstArgs>(args?: SelectSubset<T, fetchFindFirstArgs<ExtArgs>>): Prisma__fetchClient<$Result.GetResult<Prisma.$fetchPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Fetch that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {fetchFindFirstOrThrowArgs} args - Arguments to find a Fetch
     * @example
     * // Get one Fetch
     * const fetch = await prisma.fetch.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends fetchFindFirstOrThrowArgs>(args?: SelectSubset<T, fetchFindFirstOrThrowArgs<ExtArgs>>): Prisma__fetchClient<$Result.GetResult<Prisma.$fetchPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Fetches that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {fetchFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Fetches
     * const fetches = await prisma.fetch.findMany()
     * 
     * // Get first 10 Fetches
     * const fetches = await prisma.fetch.findMany({ take: 10 })
     * 
     * // Only select the `fetch_uuid`
     * const fetchWithFetch_uuidOnly = await prisma.fetch.findMany({ select: { fetch_uuid: true } })
     * 
     */
    findMany<T extends fetchFindManyArgs>(args?: SelectSubset<T, fetchFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$fetchPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Fetch.
     * @param {fetchCreateArgs} args - Arguments to create a Fetch.
     * @example
     * // Create one Fetch
     * const Fetch = await prisma.fetch.create({
     *   data: {
     *     // ... data to create a Fetch
     *   }
     * })
     * 
     */
    create<T extends fetchCreateArgs>(args: SelectSubset<T, fetchCreateArgs<ExtArgs>>): Prisma__fetchClient<$Result.GetResult<Prisma.$fetchPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Fetches.
     * @param {fetchCreateManyArgs} args - Arguments to create many Fetches.
     * @example
     * // Create many Fetches
     * const fetch = await prisma.fetch.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends fetchCreateManyArgs>(args?: SelectSubset<T, fetchCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Fetches and returns the data saved in the database.
     * @param {fetchCreateManyAndReturnArgs} args - Arguments to create many Fetches.
     * @example
     * // Create many Fetches
     * const fetch = await prisma.fetch.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Fetches and only return the `fetch_uuid`
     * const fetchWithFetch_uuidOnly = await prisma.fetch.createManyAndReturn({
     *   select: { fetch_uuid: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends fetchCreateManyAndReturnArgs>(args?: SelectSubset<T, fetchCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$fetchPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Fetch.
     * @param {fetchDeleteArgs} args - Arguments to delete one Fetch.
     * @example
     * // Delete one Fetch
     * const Fetch = await prisma.fetch.delete({
     *   where: {
     *     // ... filter to delete one Fetch
     *   }
     * })
     * 
     */
    delete<T extends fetchDeleteArgs>(args: SelectSubset<T, fetchDeleteArgs<ExtArgs>>): Prisma__fetchClient<$Result.GetResult<Prisma.$fetchPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Fetch.
     * @param {fetchUpdateArgs} args - Arguments to update one Fetch.
     * @example
     * // Update one Fetch
     * const fetch = await prisma.fetch.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends fetchUpdateArgs>(args: SelectSubset<T, fetchUpdateArgs<ExtArgs>>): Prisma__fetchClient<$Result.GetResult<Prisma.$fetchPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Fetches.
     * @param {fetchDeleteManyArgs} args - Arguments to filter Fetches to delete.
     * @example
     * // Delete a few Fetches
     * const { count } = await prisma.fetch.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends fetchDeleteManyArgs>(args?: SelectSubset<T, fetchDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Fetches.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {fetchUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Fetches
     * const fetch = await prisma.fetch.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends fetchUpdateManyArgs>(args: SelectSubset<T, fetchUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Fetches and returns the data updated in the database.
     * @param {fetchUpdateManyAndReturnArgs} args - Arguments to update many Fetches.
     * @example
     * // Update many Fetches
     * const fetch = await prisma.fetch.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Fetches and only return the `fetch_uuid`
     * const fetchWithFetch_uuidOnly = await prisma.fetch.updateManyAndReturn({
     *   select: { fetch_uuid: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends fetchUpdateManyAndReturnArgs>(args: SelectSubset<T, fetchUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$fetchPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Fetch.
     * @param {fetchUpsertArgs} args - Arguments to update or create a Fetch.
     * @example
     * // Update or create a Fetch
     * const fetch = await prisma.fetch.upsert({
     *   create: {
     *     // ... data to create a Fetch
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Fetch we want to update
     *   }
     * })
     */
    upsert<T extends fetchUpsertArgs>(args: SelectSubset<T, fetchUpsertArgs<ExtArgs>>): Prisma__fetchClient<$Result.GetResult<Prisma.$fetchPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Fetches.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {fetchCountArgs} args - Arguments to filter Fetches to count.
     * @example
     * // Count the number of Fetches
     * const count = await prisma.fetch.count({
     *   where: {
     *     // ... the filter for the Fetches we want to count
     *   }
     * })
    **/
    count<T extends fetchCountArgs>(
      args?: Subset<T, fetchCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], FetchCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Fetch.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FetchAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends FetchAggregateArgs>(args: Subset<T, FetchAggregateArgs>): Prisma.PrismaPromise<GetFetchAggregateType<T>>

    /**
     * Group by Fetch.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {fetchGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends fetchGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: fetchGroupByArgs['orderBy'] }
        : { orderBy?: fetchGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, fetchGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetFetchGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the fetch model
   */
  readonly fields: fetchFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for fetch.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__fetchClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the fetch model
   */
  interface fetchFieldRefs {
    readonly fetch_uuid: FieldRef<"fetch", 'String'>
    readonly fetch_from: FieldRef<"fetch", 'String'>
    readonly fetch_dest: FieldRef<"fetch", 'String'>
    readonly fetch_user: FieldRef<"fetch", 'String'>
    readonly fetch_flag: FieldRef<"fetch", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * fetch findUnique
   */
  export type fetchFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the fetch
     */
    select?: fetchSelect<ExtArgs> | null
    /**
     * Omit specific fields from the fetch
     */
    omit?: fetchOmit<ExtArgs> | null
    /**
     * Filter, which fetch to fetch.
     */
    where: fetchWhereUniqueInput
  }

  /**
   * fetch findUniqueOrThrow
   */
  export type fetchFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the fetch
     */
    select?: fetchSelect<ExtArgs> | null
    /**
     * Omit specific fields from the fetch
     */
    omit?: fetchOmit<ExtArgs> | null
    /**
     * Filter, which fetch to fetch.
     */
    where: fetchWhereUniqueInput
  }

  /**
   * fetch findFirst
   */
  export type fetchFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the fetch
     */
    select?: fetchSelect<ExtArgs> | null
    /**
     * Omit specific fields from the fetch
     */
    omit?: fetchOmit<ExtArgs> | null
    /**
     * Filter, which fetch to fetch.
     */
    where?: fetchWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of fetches to fetch.
     */
    orderBy?: fetchOrderByWithRelationInput | fetchOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for fetches.
     */
    cursor?: fetchWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` fetches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` fetches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of fetches.
     */
    distinct?: FetchScalarFieldEnum | FetchScalarFieldEnum[]
  }

  /**
   * fetch findFirstOrThrow
   */
  export type fetchFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the fetch
     */
    select?: fetchSelect<ExtArgs> | null
    /**
     * Omit specific fields from the fetch
     */
    omit?: fetchOmit<ExtArgs> | null
    /**
     * Filter, which fetch to fetch.
     */
    where?: fetchWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of fetches to fetch.
     */
    orderBy?: fetchOrderByWithRelationInput | fetchOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for fetches.
     */
    cursor?: fetchWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` fetches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` fetches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of fetches.
     */
    distinct?: FetchScalarFieldEnum | FetchScalarFieldEnum[]
  }

  /**
   * fetch findMany
   */
  export type fetchFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the fetch
     */
    select?: fetchSelect<ExtArgs> | null
    /**
     * Omit specific fields from the fetch
     */
    omit?: fetchOmit<ExtArgs> | null
    /**
     * Filter, which fetches to fetch.
     */
    where?: fetchWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of fetches to fetch.
     */
    orderBy?: fetchOrderByWithRelationInput | fetchOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing fetches.
     */
    cursor?: fetchWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` fetches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` fetches.
     */
    skip?: number
    distinct?: FetchScalarFieldEnum | FetchScalarFieldEnum[]
  }

  /**
   * fetch create
   */
  export type fetchCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the fetch
     */
    select?: fetchSelect<ExtArgs> | null
    /**
     * Omit specific fields from the fetch
     */
    omit?: fetchOmit<ExtArgs> | null
    /**
     * The data needed to create a fetch.
     */
    data: XOR<fetchCreateInput, fetchUncheckedCreateInput>
  }

  /**
   * fetch createMany
   */
  export type fetchCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many fetches.
     */
    data: fetchCreateManyInput | fetchCreateManyInput[]
  }

  /**
   * fetch createManyAndReturn
   */
  export type fetchCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the fetch
     */
    select?: fetchSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the fetch
     */
    omit?: fetchOmit<ExtArgs> | null
    /**
     * The data used to create many fetches.
     */
    data: fetchCreateManyInput | fetchCreateManyInput[]
  }

  /**
   * fetch update
   */
  export type fetchUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the fetch
     */
    select?: fetchSelect<ExtArgs> | null
    /**
     * Omit specific fields from the fetch
     */
    omit?: fetchOmit<ExtArgs> | null
    /**
     * The data needed to update a fetch.
     */
    data: XOR<fetchUpdateInput, fetchUncheckedUpdateInput>
    /**
     * Choose, which fetch to update.
     */
    where: fetchWhereUniqueInput
  }

  /**
   * fetch updateMany
   */
  export type fetchUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update fetches.
     */
    data: XOR<fetchUpdateManyMutationInput, fetchUncheckedUpdateManyInput>
    /**
     * Filter which fetches to update
     */
    where?: fetchWhereInput
    /**
     * Limit how many fetches to update.
     */
    limit?: number
  }

  /**
   * fetch updateManyAndReturn
   */
  export type fetchUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the fetch
     */
    select?: fetchSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the fetch
     */
    omit?: fetchOmit<ExtArgs> | null
    /**
     * The data used to update fetches.
     */
    data: XOR<fetchUpdateManyMutationInput, fetchUncheckedUpdateManyInput>
    /**
     * Filter which fetches to update
     */
    where?: fetchWhereInput
    /**
     * Limit how many fetches to update.
     */
    limit?: number
  }

  /**
   * fetch upsert
   */
  export type fetchUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the fetch
     */
    select?: fetchSelect<ExtArgs> | null
    /**
     * Omit specific fields from the fetch
     */
    omit?: fetchOmit<ExtArgs> | null
    /**
     * The filter to search for the fetch to update in case it exists.
     */
    where: fetchWhereUniqueInput
    /**
     * In case the fetch found by the `where` argument doesn't exist, create a new fetch with this data.
     */
    create: XOR<fetchCreateInput, fetchUncheckedCreateInput>
    /**
     * In case the fetch was found with the provided `where` argument, update it with this data.
     */
    update: XOR<fetchUpdateInput, fetchUncheckedUpdateInput>
  }

  /**
   * fetch delete
   */
  export type fetchDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the fetch
     */
    select?: fetchSelect<ExtArgs> | null
    /**
     * Omit specific fields from the fetch
     */
    omit?: fetchOmit<ExtArgs> | null
    /**
     * Filter which fetch to delete.
     */
    where: fetchWhereUniqueInput
  }

  /**
   * fetch deleteMany
   */
  export type fetchDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which fetches to delete
     */
    where?: fetchWhereInput
    /**
     * Limit how many fetches to delete.
     */
    limit?: number
  }

  /**
   * fetch without action
   */
  export type fetchDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the fetch
     */
    select?: fetchSelect<ExtArgs> | null
    /**
     * Omit specific fields from the fetch
     */
    omit?: fetchOmit<ExtArgs> | null
  }


  /**
   * Model group
   */

  export type AggregateGroup = {
    _count: GroupCountAggregateOutputType | null
    _avg: GroupAvgAggregateOutputType | null
    _sum: GroupSumAggregateOutputType | null
    _min: GroupMinAggregateOutputType | null
    _max: GroupMaxAggregateOutputType | null
  }

  export type GroupAvgAggregateOutputType = {
    is_enabled: number | null
  }

  export type GroupSumAggregateOutputType = {
    is_enabled: number | null
  }

  export type GroupMinAggregateOutputType = {
    group_name: string | null
    group_mask: string | null
    is_enabled: number | null
  }

  export type GroupMaxAggregateOutputType = {
    group_name: string | null
    group_mask: string | null
    is_enabled: number | null
  }

  export type GroupCountAggregateOutputType = {
    group_name: number
    group_mask: number
    is_enabled: number
    _all: number
  }


  export type GroupAvgAggregateInputType = {
    is_enabled?: true
  }

  export type GroupSumAggregateInputType = {
    is_enabled?: true
  }

  export type GroupMinAggregateInputType = {
    group_name?: true
    group_mask?: true
    is_enabled?: true
  }

  export type GroupMaxAggregateInputType = {
    group_name?: true
    group_mask?: true
    is_enabled?: true
  }

  export type GroupCountAggregateInputType = {
    group_name?: true
    group_mask?: true
    is_enabled?: true
    _all?: true
  }

  export type GroupAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which group to aggregate.
     */
    where?: groupWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of groups to fetch.
     */
    orderBy?: groupOrderByWithRelationInput | groupOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: groupWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` groups from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` groups.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned groups
    **/
    _count?: true | GroupCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: GroupAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: GroupSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: GroupMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: GroupMaxAggregateInputType
  }

  export type GetGroupAggregateType<T extends GroupAggregateArgs> = {
        [P in keyof T & keyof AggregateGroup]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateGroup[P]>
      : GetScalarType<T[P], AggregateGroup[P]>
  }




  export type groupGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: groupWhereInput
    orderBy?: groupOrderByWithAggregationInput | groupOrderByWithAggregationInput[]
    by: GroupScalarFieldEnum[] | GroupScalarFieldEnum
    having?: groupScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: GroupCountAggregateInputType | true
    _avg?: GroupAvgAggregateInputType
    _sum?: GroupSumAggregateInputType
    _min?: GroupMinAggregateInputType
    _max?: GroupMaxAggregateInputType
  }

  export type GroupGroupByOutputType = {
    group_name: string
    group_mask: string
    is_enabled: number
    _count: GroupCountAggregateOutputType | null
    _avg: GroupAvgAggregateOutputType | null
    _sum: GroupSumAggregateOutputType | null
    _min: GroupMinAggregateOutputType | null
    _max: GroupMaxAggregateOutputType | null
  }

  type GetGroupGroupByPayload<T extends groupGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<GroupGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof GroupGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], GroupGroupByOutputType[P]>
            : GetScalarType<T[P], GroupGroupByOutputType[P]>
        }
      >
    >


  export type groupSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    group_name?: boolean
    group_mask?: boolean
    is_enabled?: boolean
  }, ExtArgs["result"]["group"]>

  export type groupSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    group_name?: boolean
    group_mask?: boolean
    is_enabled?: boolean
  }, ExtArgs["result"]["group"]>

  export type groupSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    group_name?: boolean
    group_mask?: boolean
    is_enabled?: boolean
  }, ExtArgs["result"]["group"]>

  export type groupSelectScalar = {
    group_name?: boolean
    group_mask?: boolean
    is_enabled?: boolean
  }

  export type groupOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"group_name" | "group_mask" | "is_enabled", ExtArgs["result"]["group"]>

  export type $groupPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "group"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      group_name: string
      group_mask: string
      is_enabled: number
    }, ExtArgs["result"]["group"]>
    composites: {}
  }

  type groupGetPayload<S extends boolean | null | undefined | groupDefaultArgs> = $Result.GetResult<Prisma.$groupPayload, S>

  type groupCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<groupFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: GroupCountAggregateInputType | true
    }

  export interface groupDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['group'], meta: { name: 'group' } }
    /**
     * Find zero or one Group that matches the filter.
     * @param {groupFindUniqueArgs} args - Arguments to find a Group
     * @example
     * // Get one Group
     * const group = await prisma.group.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends groupFindUniqueArgs>(args: SelectSubset<T, groupFindUniqueArgs<ExtArgs>>): Prisma__groupClient<$Result.GetResult<Prisma.$groupPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Group that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {groupFindUniqueOrThrowArgs} args - Arguments to find a Group
     * @example
     * // Get one Group
     * const group = await prisma.group.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends groupFindUniqueOrThrowArgs>(args: SelectSubset<T, groupFindUniqueOrThrowArgs<ExtArgs>>): Prisma__groupClient<$Result.GetResult<Prisma.$groupPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Group that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {groupFindFirstArgs} args - Arguments to find a Group
     * @example
     * // Get one Group
     * const group = await prisma.group.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends groupFindFirstArgs>(args?: SelectSubset<T, groupFindFirstArgs<ExtArgs>>): Prisma__groupClient<$Result.GetResult<Prisma.$groupPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Group that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {groupFindFirstOrThrowArgs} args - Arguments to find a Group
     * @example
     * // Get one Group
     * const group = await prisma.group.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends groupFindFirstOrThrowArgs>(args?: SelectSubset<T, groupFindFirstOrThrowArgs<ExtArgs>>): Prisma__groupClient<$Result.GetResult<Prisma.$groupPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Groups that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {groupFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Groups
     * const groups = await prisma.group.findMany()
     * 
     * // Get first 10 Groups
     * const groups = await prisma.group.findMany({ take: 10 })
     * 
     * // Only select the `group_name`
     * const groupWithGroup_nameOnly = await prisma.group.findMany({ select: { group_name: true } })
     * 
     */
    findMany<T extends groupFindManyArgs>(args?: SelectSubset<T, groupFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$groupPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Group.
     * @param {groupCreateArgs} args - Arguments to create a Group.
     * @example
     * // Create one Group
     * const Group = await prisma.group.create({
     *   data: {
     *     // ... data to create a Group
     *   }
     * })
     * 
     */
    create<T extends groupCreateArgs>(args: SelectSubset<T, groupCreateArgs<ExtArgs>>): Prisma__groupClient<$Result.GetResult<Prisma.$groupPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Groups.
     * @param {groupCreateManyArgs} args - Arguments to create many Groups.
     * @example
     * // Create many Groups
     * const group = await prisma.group.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends groupCreateManyArgs>(args?: SelectSubset<T, groupCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Groups and returns the data saved in the database.
     * @param {groupCreateManyAndReturnArgs} args - Arguments to create many Groups.
     * @example
     * // Create many Groups
     * const group = await prisma.group.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Groups and only return the `group_name`
     * const groupWithGroup_nameOnly = await prisma.group.createManyAndReturn({
     *   select: { group_name: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends groupCreateManyAndReturnArgs>(args?: SelectSubset<T, groupCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$groupPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Group.
     * @param {groupDeleteArgs} args - Arguments to delete one Group.
     * @example
     * // Delete one Group
     * const Group = await prisma.group.delete({
     *   where: {
     *     // ... filter to delete one Group
     *   }
     * })
     * 
     */
    delete<T extends groupDeleteArgs>(args: SelectSubset<T, groupDeleteArgs<ExtArgs>>): Prisma__groupClient<$Result.GetResult<Prisma.$groupPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Group.
     * @param {groupUpdateArgs} args - Arguments to update one Group.
     * @example
     * // Update one Group
     * const group = await prisma.group.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends groupUpdateArgs>(args: SelectSubset<T, groupUpdateArgs<ExtArgs>>): Prisma__groupClient<$Result.GetResult<Prisma.$groupPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Groups.
     * @param {groupDeleteManyArgs} args - Arguments to filter Groups to delete.
     * @example
     * // Delete a few Groups
     * const { count } = await prisma.group.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends groupDeleteManyArgs>(args?: SelectSubset<T, groupDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Groups.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {groupUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Groups
     * const group = await prisma.group.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends groupUpdateManyArgs>(args: SelectSubset<T, groupUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Groups and returns the data updated in the database.
     * @param {groupUpdateManyAndReturnArgs} args - Arguments to update many Groups.
     * @example
     * // Update many Groups
     * const group = await prisma.group.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Groups and only return the `group_name`
     * const groupWithGroup_nameOnly = await prisma.group.updateManyAndReturn({
     *   select: { group_name: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends groupUpdateManyAndReturnArgs>(args: SelectSubset<T, groupUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$groupPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Group.
     * @param {groupUpsertArgs} args - Arguments to update or create a Group.
     * @example
     * // Update or create a Group
     * const group = await prisma.group.upsert({
     *   create: {
     *     // ... data to create a Group
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Group we want to update
     *   }
     * })
     */
    upsert<T extends groupUpsertArgs>(args: SelectSubset<T, groupUpsertArgs<ExtArgs>>): Prisma__groupClient<$Result.GetResult<Prisma.$groupPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Groups.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {groupCountArgs} args - Arguments to filter Groups to count.
     * @example
     * // Count the number of Groups
     * const count = await prisma.group.count({
     *   where: {
     *     // ... the filter for the Groups we want to count
     *   }
     * })
    **/
    count<T extends groupCountArgs>(
      args?: Subset<T, groupCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], GroupCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Group.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GroupAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends GroupAggregateArgs>(args: Subset<T, GroupAggregateArgs>): Prisma.PrismaPromise<GetGroupAggregateType<T>>

    /**
     * Group by Group.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {groupGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends groupGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: groupGroupByArgs['orderBy'] }
        : { orderBy?: groupGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, groupGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetGroupGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the group model
   */
  readonly fields: groupFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for group.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__groupClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the group model
   */
  interface groupFieldRefs {
    readonly group_name: FieldRef<"group", 'String'>
    readonly group_mask: FieldRef<"group", 'String'>
    readonly is_enabled: FieldRef<"group", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * group findUnique
   */
  export type groupFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the group
     */
    select?: groupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the group
     */
    omit?: groupOmit<ExtArgs> | null
    /**
     * Filter, which group to fetch.
     */
    where: groupWhereUniqueInput
  }

  /**
   * group findUniqueOrThrow
   */
  export type groupFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the group
     */
    select?: groupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the group
     */
    omit?: groupOmit<ExtArgs> | null
    /**
     * Filter, which group to fetch.
     */
    where: groupWhereUniqueInput
  }

  /**
   * group findFirst
   */
  export type groupFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the group
     */
    select?: groupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the group
     */
    omit?: groupOmit<ExtArgs> | null
    /**
     * Filter, which group to fetch.
     */
    where?: groupWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of groups to fetch.
     */
    orderBy?: groupOrderByWithRelationInput | groupOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for groups.
     */
    cursor?: groupWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` groups from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` groups.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of groups.
     */
    distinct?: GroupScalarFieldEnum | GroupScalarFieldEnum[]
  }

  /**
   * group findFirstOrThrow
   */
  export type groupFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the group
     */
    select?: groupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the group
     */
    omit?: groupOmit<ExtArgs> | null
    /**
     * Filter, which group to fetch.
     */
    where?: groupWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of groups to fetch.
     */
    orderBy?: groupOrderByWithRelationInput | groupOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for groups.
     */
    cursor?: groupWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` groups from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` groups.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of groups.
     */
    distinct?: GroupScalarFieldEnum | GroupScalarFieldEnum[]
  }

  /**
   * group findMany
   */
  export type groupFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the group
     */
    select?: groupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the group
     */
    omit?: groupOmit<ExtArgs> | null
    /**
     * Filter, which groups to fetch.
     */
    where?: groupWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of groups to fetch.
     */
    orderBy?: groupOrderByWithRelationInput | groupOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing groups.
     */
    cursor?: groupWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` groups from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` groups.
     */
    skip?: number
    distinct?: GroupScalarFieldEnum | GroupScalarFieldEnum[]
  }

  /**
   * group create
   */
  export type groupCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the group
     */
    select?: groupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the group
     */
    omit?: groupOmit<ExtArgs> | null
    /**
     * The data needed to create a group.
     */
    data: XOR<groupCreateInput, groupUncheckedCreateInput>
  }

  /**
   * group createMany
   */
  export type groupCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many groups.
     */
    data: groupCreateManyInput | groupCreateManyInput[]
  }

  /**
   * group createManyAndReturn
   */
  export type groupCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the group
     */
    select?: groupSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the group
     */
    omit?: groupOmit<ExtArgs> | null
    /**
     * The data used to create many groups.
     */
    data: groupCreateManyInput | groupCreateManyInput[]
  }

  /**
   * group update
   */
  export type groupUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the group
     */
    select?: groupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the group
     */
    omit?: groupOmit<ExtArgs> | null
    /**
     * The data needed to update a group.
     */
    data: XOR<groupUpdateInput, groupUncheckedUpdateInput>
    /**
     * Choose, which group to update.
     */
    where: groupWhereUniqueInput
  }

  /**
   * group updateMany
   */
  export type groupUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update groups.
     */
    data: XOR<groupUpdateManyMutationInput, groupUncheckedUpdateManyInput>
    /**
     * Filter which groups to update
     */
    where?: groupWhereInput
    /**
     * Limit how many groups to update.
     */
    limit?: number
  }

  /**
   * group updateManyAndReturn
   */
  export type groupUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the group
     */
    select?: groupSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the group
     */
    omit?: groupOmit<ExtArgs> | null
    /**
     * The data used to update groups.
     */
    data: XOR<groupUpdateManyMutationInput, groupUncheckedUpdateManyInput>
    /**
     * Filter which groups to update
     */
    where?: groupWhereInput
    /**
     * Limit how many groups to update.
     */
    limit?: number
  }

  /**
   * group upsert
   */
  export type groupUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the group
     */
    select?: groupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the group
     */
    omit?: groupOmit<ExtArgs> | null
    /**
     * The filter to search for the group to update in case it exists.
     */
    where: groupWhereUniqueInput
    /**
     * In case the group found by the `where` argument doesn't exist, create a new group with this data.
     */
    create: XOR<groupCreateInput, groupUncheckedCreateInput>
    /**
     * In case the group was found with the provided `where` argument, update it with this data.
     */
    update: XOR<groupUpdateInput, groupUncheckedUpdateInput>
  }

  /**
   * group delete
   */
  export type groupDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the group
     */
    select?: groupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the group
     */
    omit?: groupOmit<ExtArgs> | null
    /**
     * Filter which group to delete.
     */
    where: groupWhereUniqueInput
  }

  /**
   * group deleteMany
   */
  export type groupDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which groups to delete
     */
    where?: groupWhereInput
    /**
     * Limit how many groups to delete.
     */
    limit?: number
  }

  /**
   * group without action
   */
  export type groupDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the group
     */
    select?: groupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the group
     */
    omit?: groupOmit<ExtArgs> | null
  }


  /**
   * Model cache
   */

  export type AggregateCache = {
    _count: CacheCountAggregateOutputType | null
    _avg: CacheAvgAggregateOutputType | null
    _sum: CacheSumAggregateOutputType | null
    _min: CacheMinAggregateOutputType | null
    _max: CacheMaxAggregateOutputType | null
  }

  export type CacheAvgAggregateOutputType = {
    cache_info: number | null
    cache_time: number | null
  }

  export type CacheSumAggregateOutputType = {
    cache_info: number | null
    cache_time: number | null
  }

  export type CacheMinAggregateOutputType = {
    cache_path: string | null
    cache_info: number | null
    cache_time: number | null
  }

  export type CacheMaxAggregateOutputType = {
    cache_path: string | null
    cache_info: number | null
    cache_time: number | null
  }

  export type CacheCountAggregateOutputType = {
    cache_path: number
    cache_info: number
    cache_time: number
    _all: number
  }


  export type CacheAvgAggregateInputType = {
    cache_info?: true
    cache_time?: true
  }

  export type CacheSumAggregateInputType = {
    cache_info?: true
    cache_time?: true
  }

  export type CacheMinAggregateInputType = {
    cache_path?: true
    cache_info?: true
    cache_time?: true
  }

  export type CacheMaxAggregateInputType = {
    cache_path?: true
    cache_info?: true
    cache_time?: true
  }

  export type CacheCountAggregateInputType = {
    cache_path?: true
    cache_info?: true
    cache_time?: true
    _all?: true
  }

  export type CacheAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which cache to aggregate.
     */
    where?: cacheWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of caches to fetch.
     */
    orderBy?: cacheOrderByWithRelationInput | cacheOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: cacheWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` caches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` caches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned caches
    **/
    _count?: true | CacheCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CacheAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CacheSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CacheMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CacheMaxAggregateInputType
  }

  export type GetCacheAggregateType<T extends CacheAggregateArgs> = {
        [P in keyof T & keyof AggregateCache]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCache[P]>
      : GetScalarType<T[P], AggregateCache[P]>
  }




  export type cacheGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: cacheWhereInput
    orderBy?: cacheOrderByWithAggregationInput | cacheOrderByWithAggregationInput[]
    by: CacheScalarFieldEnum[] | CacheScalarFieldEnum
    having?: cacheScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CacheCountAggregateInputType | true
    _avg?: CacheAvgAggregateInputType
    _sum?: CacheSumAggregateInputType
    _min?: CacheMinAggregateInputType
    _max?: CacheMaxAggregateInputType
  }

  export type CacheGroupByOutputType = {
    cache_path: string
    cache_info: number | null
    cache_time: number | null
    _count: CacheCountAggregateOutputType | null
    _avg: CacheAvgAggregateOutputType | null
    _sum: CacheSumAggregateOutputType | null
    _min: CacheMinAggregateOutputType | null
    _max: CacheMaxAggregateOutputType | null
  }

  type GetCacheGroupByPayload<T extends cacheGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CacheGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CacheGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CacheGroupByOutputType[P]>
            : GetScalarType<T[P], CacheGroupByOutputType[P]>
        }
      >
    >


  export type cacheSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    cache_path?: boolean
    cache_info?: boolean
    cache_time?: boolean
  }, ExtArgs["result"]["cache"]>

  export type cacheSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    cache_path?: boolean
    cache_info?: boolean
    cache_time?: boolean
  }, ExtArgs["result"]["cache"]>

  export type cacheSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    cache_path?: boolean
    cache_info?: boolean
    cache_time?: boolean
  }, ExtArgs["result"]["cache"]>

  export type cacheSelectScalar = {
    cache_path?: boolean
    cache_info?: boolean
    cache_time?: boolean
  }

  export type cacheOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"cache_path" | "cache_info" | "cache_time", ExtArgs["result"]["cache"]>

  export type $cachePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "cache"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      cache_path: string
      cache_info: number | null
      cache_time: number | null
    }, ExtArgs["result"]["cache"]>
    composites: {}
  }

  type cacheGetPayload<S extends boolean | null | undefined | cacheDefaultArgs> = $Result.GetResult<Prisma.$cachePayload, S>

  type cacheCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<cacheFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CacheCountAggregateInputType | true
    }

  export interface cacheDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['cache'], meta: { name: 'cache' } }
    /**
     * Find zero or one Cache that matches the filter.
     * @param {cacheFindUniqueArgs} args - Arguments to find a Cache
     * @example
     * // Get one Cache
     * const cache = await prisma.cache.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends cacheFindUniqueArgs>(args: SelectSubset<T, cacheFindUniqueArgs<ExtArgs>>): Prisma__cacheClient<$Result.GetResult<Prisma.$cachePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Cache that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {cacheFindUniqueOrThrowArgs} args - Arguments to find a Cache
     * @example
     * // Get one Cache
     * const cache = await prisma.cache.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends cacheFindUniqueOrThrowArgs>(args: SelectSubset<T, cacheFindUniqueOrThrowArgs<ExtArgs>>): Prisma__cacheClient<$Result.GetResult<Prisma.$cachePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Cache that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {cacheFindFirstArgs} args - Arguments to find a Cache
     * @example
     * // Get one Cache
     * const cache = await prisma.cache.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends cacheFindFirstArgs>(args?: SelectSubset<T, cacheFindFirstArgs<ExtArgs>>): Prisma__cacheClient<$Result.GetResult<Prisma.$cachePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Cache that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {cacheFindFirstOrThrowArgs} args - Arguments to find a Cache
     * @example
     * // Get one Cache
     * const cache = await prisma.cache.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends cacheFindFirstOrThrowArgs>(args?: SelectSubset<T, cacheFindFirstOrThrowArgs<ExtArgs>>): Prisma__cacheClient<$Result.GetResult<Prisma.$cachePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Caches that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {cacheFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Caches
     * const caches = await prisma.cache.findMany()
     * 
     * // Get first 10 Caches
     * const caches = await prisma.cache.findMany({ take: 10 })
     * 
     * // Only select the `cache_path`
     * const cacheWithCache_pathOnly = await prisma.cache.findMany({ select: { cache_path: true } })
     * 
     */
    findMany<T extends cacheFindManyArgs>(args?: SelectSubset<T, cacheFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$cachePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Cache.
     * @param {cacheCreateArgs} args - Arguments to create a Cache.
     * @example
     * // Create one Cache
     * const Cache = await prisma.cache.create({
     *   data: {
     *     // ... data to create a Cache
     *   }
     * })
     * 
     */
    create<T extends cacheCreateArgs>(args: SelectSubset<T, cacheCreateArgs<ExtArgs>>): Prisma__cacheClient<$Result.GetResult<Prisma.$cachePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Caches.
     * @param {cacheCreateManyArgs} args - Arguments to create many Caches.
     * @example
     * // Create many Caches
     * const cache = await prisma.cache.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends cacheCreateManyArgs>(args?: SelectSubset<T, cacheCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Caches and returns the data saved in the database.
     * @param {cacheCreateManyAndReturnArgs} args - Arguments to create many Caches.
     * @example
     * // Create many Caches
     * const cache = await prisma.cache.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Caches and only return the `cache_path`
     * const cacheWithCache_pathOnly = await prisma.cache.createManyAndReturn({
     *   select: { cache_path: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends cacheCreateManyAndReturnArgs>(args?: SelectSubset<T, cacheCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$cachePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Cache.
     * @param {cacheDeleteArgs} args - Arguments to delete one Cache.
     * @example
     * // Delete one Cache
     * const Cache = await prisma.cache.delete({
     *   where: {
     *     // ... filter to delete one Cache
     *   }
     * })
     * 
     */
    delete<T extends cacheDeleteArgs>(args: SelectSubset<T, cacheDeleteArgs<ExtArgs>>): Prisma__cacheClient<$Result.GetResult<Prisma.$cachePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Cache.
     * @param {cacheUpdateArgs} args - Arguments to update one Cache.
     * @example
     * // Update one Cache
     * const cache = await prisma.cache.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends cacheUpdateArgs>(args: SelectSubset<T, cacheUpdateArgs<ExtArgs>>): Prisma__cacheClient<$Result.GetResult<Prisma.$cachePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Caches.
     * @param {cacheDeleteManyArgs} args - Arguments to filter Caches to delete.
     * @example
     * // Delete a few Caches
     * const { count } = await prisma.cache.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends cacheDeleteManyArgs>(args?: SelectSubset<T, cacheDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Caches.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {cacheUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Caches
     * const cache = await prisma.cache.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends cacheUpdateManyArgs>(args: SelectSubset<T, cacheUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Caches and returns the data updated in the database.
     * @param {cacheUpdateManyAndReturnArgs} args - Arguments to update many Caches.
     * @example
     * // Update many Caches
     * const cache = await prisma.cache.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Caches and only return the `cache_path`
     * const cacheWithCache_pathOnly = await prisma.cache.updateManyAndReturn({
     *   select: { cache_path: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends cacheUpdateManyAndReturnArgs>(args: SelectSubset<T, cacheUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$cachePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Cache.
     * @param {cacheUpsertArgs} args - Arguments to update or create a Cache.
     * @example
     * // Update or create a Cache
     * const cache = await prisma.cache.upsert({
     *   create: {
     *     // ... data to create a Cache
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Cache we want to update
     *   }
     * })
     */
    upsert<T extends cacheUpsertArgs>(args: SelectSubset<T, cacheUpsertArgs<ExtArgs>>): Prisma__cacheClient<$Result.GetResult<Prisma.$cachePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Caches.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {cacheCountArgs} args - Arguments to filter Caches to count.
     * @example
     * // Count the number of Caches
     * const count = await prisma.cache.count({
     *   where: {
     *     // ... the filter for the Caches we want to count
     *   }
     * })
    **/
    count<T extends cacheCountArgs>(
      args?: Subset<T, cacheCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CacheCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Cache.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CacheAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CacheAggregateArgs>(args: Subset<T, CacheAggregateArgs>): Prisma.PrismaPromise<GetCacheAggregateType<T>>

    /**
     * Group by Cache.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {cacheGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends cacheGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: cacheGroupByArgs['orderBy'] }
        : { orderBy?: cacheGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, cacheGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCacheGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the cache model
   */
  readonly fields: cacheFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for cache.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__cacheClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the cache model
   */
  interface cacheFieldRefs {
    readonly cache_path: FieldRef<"cache", 'String'>
    readonly cache_info: FieldRef<"cache", 'Int'>
    readonly cache_time: FieldRef<"cache", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * cache findUnique
   */
  export type cacheFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cache
     */
    select?: cacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cache
     */
    omit?: cacheOmit<ExtArgs> | null
    /**
     * Filter, which cache to fetch.
     */
    where: cacheWhereUniqueInput
  }

  /**
   * cache findUniqueOrThrow
   */
  export type cacheFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cache
     */
    select?: cacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cache
     */
    omit?: cacheOmit<ExtArgs> | null
    /**
     * Filter, which cache to fetch.
     */
    where: cacheWhereUniqueInput
  }

  /**
   * cache findFirst
   */
  export type cacheFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cache
     */
    select?: cacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cache
     */
    omit?: cacheOmit<ExtArgs> | null
    /**
     * Filter, which cache to fetch.
     */
    where?: cacheWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of caches to fetch.
     */
    orderBy?: cacheOrderByWithRelationInput | cacheOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for caches.
     */
    cursor?: cacheWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` caches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` caches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of caches.
     */
    distinct?: CacheScalarFieldEnum | CacheScalarFieldEnum[]
  }

  /**
   * cache findFirstOrThrow
   */
  export type cacheFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cache
     */
    select?: cacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cache
     */
    omit?: cacheOmit<ExtArgs> | null
    /**
     * Filter, which cache to fetch.
     */
    where?: cacheWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of caches to fetch.
     */
    orderBy?: cacheOrderByWithRelationInput | cacheOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for caches.
     */
    cursor?: cacheWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` caches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` caches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of caches.
     */
    distinct?: CacheScalarFieldEnum | CacheScalarFieldEnum[]
  }

  /**
   * cache findMany
   */
  export type cacheFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cache
     */
    select?: cacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cache
     */
    omit?: cacheOmit<ExtArgs> | null
    /**
     * Filter, which caches to fetch.
     */
    where?: cacheWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of caches to fetch.
     */
    orderBy?: cacheOrderByWithRelationInput | cacheOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing caches.
     */
    cursor?: cacheWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` caches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` caches.
     */
    skip?: number
    distinct?: CacheScalarFieldEnum | CacheScalarFieldEnum[]
  }

  /**
   * cache create
   */
  export type cacheCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cache
     */
    select?: cacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cache
     */
    omit?: cacheOmit<ExtArgs> | null
    /**
     * The data needed to create a cache.
     */
    data: XOR<cacheCreateInput, cacheUncheckedCreateInput>
  }

  /**
   * cache createMany
   */
  export type cacheCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many caches.
     */
    data: cacheCreateManyInput | cacheCreateManyInput[]
  }

  /**
   * cache createManyAndReturn
   */
  export type cacheCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cache
     */
    select?: cacheSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the cache
     */
    omit?: cacheOmit<ExtArgs> | null
    /**
     * The data used to create many caches.
     */
    data: cacheCreateManyInput | cacheCreateManyInput[]
  }

  /**
   * cache update
   */
  export type cacheUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cache
     */
    select?: cacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cache
     */
    omit?: cacheOmit<ExtArgs> | null
    /**
     * The data needed to update a cache.
     */
    data: XOR<cacheUpdateInput, cacheUncheckedUpdateInput>
    /**
     * Choose, which cache to update.
     */
    where: cacheWhereUniqueInput
  }

  /**
   * cache updateMany
   */
  export type cacheUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update caches.
     */
    data: XOR<cacheUpdateManyMutationInput, cacheUncheckedUpdateManyInput>
    /**
     * Filter which caches to update
     */
    where?: cacheWhereInput
    /**
     * Limit how many caches to update.
     */
    limit?: number
  }

  /**
   * cache updateManyAndReturn
   */
  export type cacheUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cache
     */
    select?: cacheSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the cache
     */
    omit?: cacheOmit<ExtArgs> | null
    /**
     * The data used to update caches.
     */
    data: XOR<cacheUpdateManyMutationInput, cacheUncheckedUpdateManyInput>
    /**
     * Filter which caches to update
     */
    where?: cacheWhereInput
    /**
     * Limit how many caches to update.
     */
    limit?: number
  }

  /**
   * cache upsert
   */
  export type cacheUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cache
     */
    select?: cacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cache
     */
    omit?: cacheOmit<ExtArgs> | null
    /**
     * The filter to search for the cache to update in case it exists.
     */
    where: cacheWhereUniqueInput
    /**
     * In case the cache found by the `where` argument doesn't exist, create a new cache with this data.
     */
    create: XOR<cacheCreateInput, cacheUncheckedCreateInput>
    /**
     * In case the cache was found with the provided `where` argument, update it with this data.
     */
    update: XOR<cacheUpdateInput, cacheUncheckedUpdateInput>
  }

  /**
   * cache delete
   */
  export type cacheDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cache
     */
    select?: cacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cache
     */
    omit?: cacheOmit<ExtArgs> | null
    /**
     * Filter which cache to delete.
     */
    where: cacheWhereUniqueInput
  }

  /**
   * cache deleteMany
   */
  export type cacheDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which caches to delete
     */
    where?: cacheWhereInput
    /**
     * Limit how many caches to delete.
     */
    limit?: number
  }

  /**
   * cache without action
   */
  export type cacheDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cache
     */
    select?: cacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cache
     */
    omit?: cacheOmit<ExtArgs> | null
  }


  /**
   * Model admin
   */

  export type AggregateAdmin = {
    _count: AdminCountAggregateOutputType | null
    _min: AdminMinAggregateOutputType | null
    _max: AdminMaxAggregateOutputType | null
  }

  export type AdminMinAggregateOutputType = {
    admin_keys: string | null
    admin_data: string | null
  }

  export type AdminMaxAggregateOutputType = {
    admin_keys: string | null
    admin_data: string | null
  }

  export type AdminCountAggregateOutputType = {
    admin_keys: number
    admin_data: number
    _all: number
  }


  export type AdminMinAggregateInputType = {
    admin_keys?: true
    admin_data?: true
  }

  export type AdminMaxAggregateInputType = {
    admin_keys?: true
    admin_data?: true
  }

  export type AdminCountAggregateInputType = {
    admin_keys?: true
    admin_data?: true
    _all?: true
  }

  export type AdminAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which admin to aggregate.
     */
    where?: adminWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of admins to fetch.
     */
    orderBy?: adminOrderByWithRelationInput | adminOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: adminWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` admins from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` admins.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned admins
    **/
    _count?: true | AdminCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AdminMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AdminMaxAggregateInputType
  }

  export type GetAdminAggregateType<T extends AdminAggregateArgs> = {
        [P in keyof T & keyof AggregateAdmin]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAdmin[P]>
      : GetScalarType<T[P], AggregateAdmin[P]>
  }




  export type adminGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: adminWhereInput
    orderBy?: adminOrderByWithAggregationInput | adminOrderByWithAggregationInput[]
    by: AdminScalarFieldEnum[] | AdminScalarFieldEnum
    having?: adminScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AdminCountAggregateInputType | true
    _min?: AdminMinAggregateInputType
    _max?: AdminMaxAggregateInputType
  }

  export type AdminGroupByOutputType = {
    admin_keys: string
    admin_data: string
    _count: AdminCountAggregateOutputType | null
    _min: AdminMinAggregateOutputType | null
    _max: AdminMaxAggregateOutputType | null
  }

  type GetAdminGroupByPayload<T extends adminGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AdminGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AdminGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AdminGroupByOutputType[P]>
            : GetScalarType<T[P], AdminGroupByOutputType[P]>
        }
      >
    >


  export type adminSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    admin_keys?: boolean
    admin_data?: boolean
  }, ExtArgs["result"]["admin"]>

  export type adminSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    admin_keys?: boolean
    admin_data?: boolean
  }, ExtArgs["result"]["admin"]>

  export type adminSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    admin_keys?: boolean
    admin_data?: boolean
  }, ExtArgs["result"]["admin"]>

  export type adminSelectScalar = {
    admin_keys?: boolean
    admin_data?: boolean
  }

  export type adminOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"admin_keys" | "admin_data", ExtArgs["result"]["admin"]>

  export type $adminPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "admin"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      admin_keys: string
      admin_data: string
    }, ExtArgs["result"]["admin"]>
    composites: {}
  }

  type adminGetPayload<S extends boolean | null | undefined | adminDefaultArgs> = $Result.GetResult<Prisma.$adminPayload, S>

  type adminCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<adminFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AdminCountAggregateInputType | true
    }

  export interface adminDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['admin'], meta: { name: 'admin' } }
    /**
     * Find zero or one Admin that matches the filter.
     * @param {adminFindUniqueArgs} args - Arguments to find a Admin
     * @example
     * // Get one Admin
     * const admin = await prisma.admin.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends adminFindUniqueArgs>(args: SelectSubset<T, adminFindUniqueArgs<ExtArgs>>): Prisma__adminClient<$Result.GetResult<Prisma.$adminPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Admin that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {adminFindUniqueOrThrowArgs} args - Arguments to find a Admin
     * @example
     * // Get one Admin
     * const admin = await prisma.admin.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends adminFindUniqueOrThrowArgs>(args: SelectSubset<T, adminFindUniqueOrThrowArgs<ExtArgs>>): Prisma__adminClient<$Result.GetResult<Prisma.$adminPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Admin that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {adminFindFirstArgs} args - Arguments to find a Admin
     * @example
     * // Get one Admin
     * const admin = await prisma.admin.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends adminFindFirstArgs>(args?: SelectSubset<T, adminFindFirstArgs<ExtArgs>>): Prisma__adminClient<$Result.GetResult<Prisma.$adminPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Admin that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {adminFindFirstOrThrowArgs} args - Arguments to find a Admin
     * @example
     * // Get one Admin
     * const admin = await prisma.admin.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends adminFindFirstOrThrowArgs>(args?: SelectSubset<T, adminFindFirstOrThrowArgs<ExtArgs>>): Prisma__adminClient<$Result.GetResult<Prisma.$adminPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Admins that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {adminFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Admins
     * const admins = await prisma.admin.findMany()
     * 
     * // Get first 10 Admins
     * const admins = await prisma.admin.findMany({ take: 10 })
     * 
     * // Only select the `admin_keys`
     * const adminWithAdmin_keysOnly = await prisma.admin.findMany({ select: { admin_keys: true } })
     * 
     */
    findMany<T extends adminFindManyArgs>(args?: SelectSubset<T, adminFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$adminPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Admin.
     * @param {adminCreateArgs} args - Arguments to create a Admin.
     * @example
     * // Create one Admin
     * const Admin = await prisma.admin.create({
     *   data: {
     *     // ... data to create a Admin
     *   }
     * })
     * 
     */
    create<T extends adminCreateArgs>(args: SelectSubset<T, adminCreateArgs<ExtArgs>>): Prisma__adminClient<$Result.GetResult<Prisma.$adminPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Admins.
     * @param {adminCreateManyArgs} args - Arguments to create many Admins.
     * @example
     * // Create many Admins
     * const admin = await prisma.admin.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends adminCreateManyArgs>(args?: SelectSubset<T, adminCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Admins and returns the data saved in the database.
     * @param {adminCreateManyAndReturnArgs} args - Arguments to create many Admins.
     * @example
     * // Create many Admins
     * const admin = await prisma.admin.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Admins and only return the `admin_keys`
     * const adminWithAdmin_keysOnly = await prisma.admin.createManyAndReturn({
     *   select: { admin_keys: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends adminCreateManyAndReturnArgs>(args?: SelectSubset<T, adminCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$adminPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Admin.
     * @param {adminDeleteArgs} args - Arguments to delete one Admin.
     * @example
     * // Delete one Admin
     * const Admin = await prisma.admin.delete({
     *   where: {
     *     // ... filter to delete one Admin
     *   }
     * })
     * 
     */
    delete<T extends adminDeleteArgs>(args: SelectSubset<T, adminDeleteArgs<ExtArgs>>): Prisma__adminClient<$Result.GetResult<Prisma.$adminPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Admin.
     * @param {adminUpdateArgs} args - Arguments to update one Admin.
     * @example
     * // Update one Admin
     * const admin = await prisma.admin.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends adminUpdateArgs>(args: SelectSubset<T, adminUpdateArgs<ExtArgs>>): Prisma__adminClient<$Result.GetResult<Prisma.$adminPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Admins.
     * @param {adminDeleteManyArgs} args - Arguments to filter Admins to delete.
     * @example
     * // Delete a few Admins
     * const { count } = await prisma.admin.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends adminDeleteManyArgs>(args?: SelectSubset<T, adminDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Admins.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {adminUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Admins
     * const admin = await prisma.admin.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends adminUpdateManyArgs>(args: SelectSubset<T, adminUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Admins and returns the data updated in the database.
     * @param {adminUpdateManyAndReturnArgs} args - Arguments to update many Admins.
     * @example
     * // Update many Admins
     * const admin = await prisma.admin.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Admins and only return the `admin_keys`
     * const adminWithAdmin_keysOnly = await prisma.admin.updateManyAndReturn({
     *   select: { admin_keys: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends adminUpdateManyAndReturnArgs>(args: SelectSubset<T, adminUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$adminPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Admin.
     * @param {adminUpsertArgs} args - Arguments to update or create a Admin.
     * @example
     * // Update or create a Admin
     * const admin = await prisma.admin.upsert({
     *   create: {
     *     // ... data to create a Admin
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Admin we want to update
     *   }
     * })
     */
    upsert<T extends adminUpsertArgs>(args: SelectSubset<T, adminUpsertArgs<ExtArgs>>): Prisma__adminClient<$Result.GetResult<Prisma.$adminPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Admins.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {adminCountArgs} args - Arguments to filter Admins to count.
     * @example
     * // Count the number of Admins
     * const count = await prisma.admin.count({
     *   where: {
     *     // ... the filter for the Admins we want to count
     *   }
     * })
    **/
    count<T extends adminCountArgs>(
      args?: Subset<T, adminCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AdminCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Admin.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AdminAggregateArgs>(args: Subset<T, AdminAggregateArgs>): Prisma.PrismaPromise<GetAdminAggregateType<T>>

    /**
     * Group by Admin.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {adminGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends adminGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: adminGroupByArgs['orderBy'] }
        : { orderBy?: adminGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, adminGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAdminGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the admin model
   */
  readonly fields: adminFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for admin.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__adminClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the admin model
   */
  interface adminFieldRefs {
    readonly admin_keys: FieldRef<"admin", 'String'>
    readonly admin_data: FieldRef<"admin", 'String'>
  }
    

  // Custom InputTypes
  /**
   * admin findUnique
   */
  export type adminFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the admin
     */
    select?: adminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the admin
     */
    omit?: adminOmit<ExtArgs> | null
    /**
     * Filter, which admin to fetch.
     */
    where: adminWhereUniqueInput
  }

  /**
   * admin findUniqueOrThrow
   */
  export type adminFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the admin
     */
    select?: adminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the admin
     */
    omit?: adminOmit<ExtArgs> | null
    /**
     * Filter, which admin to fetch.
     */
    where: adminWhereUniqueInput
  }

  /**
   * admin findFirst
   */
  export type adminFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the admin
     */
    select?: adminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the admin
     */
    omit?: adminOmit<ExtArgs> | null
    /**
     * Filter, which admin to fetch.
     */
    where?: adminWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of admins to fetch.
     */
    orderBy?: adminOrderByWithRelationInput | adminOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for admins.
     */
    cursor?: adminWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` admins from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` admins.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of admins.
     */
    distinct?: AdminScalarFieldEnum | AdminScalarFieldEnum[]
  }

  /**
   * admin findFirstOrThrow
   */
  export type adminFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the admin
     */
    select?: adminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the admin
     */
    omit?: adminOmit<ExtArgs> | null
    /**
     * Filter, which admin to fetch.
     */
    where?: adminWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of admins to fetch.
     */
    orderBy?: adminOrderByWithRelationInput | adminOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for admins.
     */
    cursor?: adminWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` admins from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` admins.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of admins.
     */
    distinct?: AdminScalarFieldEnum | AdminScalarFieldEnum[]
  }

  /**
   * admin findMany
   */
  export type adminFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the admin
     */
    select?: adminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the admin
     */
    omit?: adminOmit<ExtArgs> | null
    /**
     * Filter, which admins to fetch.
     */
    where?: adminWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of admins to fetch.
     */
    orderBy?: adminOrderByWithRelationInput | adminOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing admins.
     */
    cursor?: adminWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` admins from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` admins.
     */
    skip?: number
    distinct?: AdminScalarFieldEnum | AdminScalarFieldEnum[]
  }

  /**
   * admin create
   */
  export type adminCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the admin
     */
    select?: adminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the admin
     */
    omit?: adminOmit<ExtArgs> | null
    /**
     * The data needed to create a admin.
     */
    data: XOR<adminCreateInput, adminUncheckedCreateInput>
  }

  /**
   * admin createMany
   */
  export type adminCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many admins.
     */
    data: adminCreateManyInput | adminCreateManyInput[]
  }

  /**
   * admin createManyAndReturn
   */
  export type adminCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the admin
     */
    select?: adminSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the admin
     */
    omit?: adminOmit<ExtArgs> | null
    /**
     * The data used to create many admins.
     */
    data: adminCreateManyInput | adminCreateManyInput[]
  }

  /**
   * admin update
   */
  export type adminUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the admin
     */
    select?: adminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the admin
     */
    omit?: adminOmit<ExtArgs> | null
    /**
     * The data needed to update a admin.
     */
    data: XOR<adminUpdateInput, adminUncheckedUpdateInput>
    /**
     * Choose, which admin to update.
     */
    where: adminWhereUniqueInput
  }

  /**
   * admin updateMany
   */
  export type adminUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update admins.
     */
    data: XOR<adminUpdateManyMutationInput, adminUncheckedUpdateManyInput>
    /**
     * Filter which admins to update
     */
    where?: adminWhereInput
    /**
     * Limit how many admins to update.
     */
    limit?: number
  }

  /**
   * admin updateManyAndReturn
   */
  export type adminUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the admin
     */
    select?: adminSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the admin
     */
    omit?: adminOmit<ExtArgs> | null
    /**
     * The data used to update admins.
     */
    data: XOR<adminUpdateManyMutationInput, adminUncheckedUpdateManyInput>
    /**
     * Filter which admins to update
     */
    where?: adminWhereInput
    /**
     * Limit how many admins to update.
     */
    limit?: number
  }

  /**
   * admin upsert
   */
  export type adminUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the admin
     */
    select?: adminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the admin
     */
    omit?: adminOmit<ExtArgs> | null
    /**
     * The filter to search for the admin to update in case it exists.
     */
    where: adminWhereUniqueInput
    /**
     * In case the admin found by the `where` argument doesn't exist, create a new admin with this data.
     */
    create: XOR<adminCreateInput, adminUncheckedCreateInput>
    /**
     * In case the admin was found with the provided `where` argument, update it with this data.
     */
    update: XOR<adminUpdateInput, adminUncheckedUpdateInput>
  }

  /**
   * admin delete
   */
  export type adminDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the admin
     */
    select?: adminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the admin
     */
    omit?: adminOmit<ExtArgs> | null
    /**
     * Filter which admin to delete.
     */
    where: adminWhereUniqueInput
  }

  /**
   * admin deleteMany
   */
  export type adminDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which admins to delete
     */
    where?: adminWhereInput
    /**
     * Limit how many admins to delete.
     */
    limit?: number
  }

  /**
   * admin without action
   */
  export type adminDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the admin
     */
    select?: adminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the admin
     */
    omit?: adminOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const MountScalarFieldEnum: {
    mount_path: 'mount_path',
    mount_type: 'mount_type',
    is_enabled: 'is_enabled',
    drive_conf: 'drive_conf',
    drive_save: 'drive_save',
    cache_time: 'cache_time',
    index_list: 'index_list',
    proxy_mode: 'proxy_mode',
    proxy_data: 'proxy_data',
    drive_logs: 'drive_logs',
    drive_tips: 'drive_tips'
  };

  export type MountScalarFieldEnum = (typeof MountScalarFieldEnum)[keyof typeof MountScalarFieldEnum]


  export const UsersScalarFieldEnum: {
    users_name: 'users_name',
    users_mail: 'users_mail',
    users_pass: 'users_pass',
    users_mask: 'users_mask',
    is_enabled: 'is_enabled',
    total_size: 'total_size',
    total_used: 'total_used',
    oauth_data: 'oauth_data',
    mount_data: 'mount_data'
  };

  export type UsersScalarFieldEnum = (typeof UsersScalarFieldEnum)[keyof typeof UsersScalarFieldEnum]


  export const OauthScalarFieldEnum: {
    oauth_name: 'oauth_name',
    oauth_type: 'oauth_type',
    oauth_data: 'oauth_data',
    is_enabled: 'is_enabled'
  };

  export type OauthScalarFieldEnum = (typeof OauthScalarFieldEnum)[keyof typeof OauthScalarFieldEnum]


  export const BindsScalarFieldEnum: {
    oauth_uuid: 'oauth_uuid',
    oauth_name: 'oauth_name',
    binds_user: 'binds_user',
    binds_data: 'binds_data',
    is_enabled: 'is_enabled'
  };

  export type BindsScalarFieldEnum = (typeof BindsScalarFieldEnum)[keyof typeof BindsScalarFieldEnum]


  export const CryptScalarFieldEnum: {
    crypt_name: 'crypt_name',
    crypt_pass: 'crypt_pass',
    crypt_type: 'crypt_type',
    crypt_mode: 'crypt_mode',
    is_enabled: 'is_enabled',
    crypt_self: 'crypt_self',
    rands_pass: 'rands_pass',
    oauth_data: 'oauth_data',
    write_name: 'write_name'
  };

  export type CryptScalarFieldEnum = (typeof CryptScalarFieldEnum)[keyof typeof CryptScalarFieldEnum]


  export const MatesScalarFieldEnum: {
    mates_name: 'mates_name',
    mates_mask: 'mates_mask',
    mates_user: 'mates_user',
    is_enabled: 'is_enabled',
    dir_hidden: 'dir_hidden',
    dir_shared: 'dir_shared',
    set_zipped: 'set_zipped',
    set_parted: 'set_parted',
    crypt_name: 'crypt_name',
    cache_time: 'cache_time'
  };

  export type MatesScalarFieldEnum = (typeof MatesScalarFieldEnum)[keyof typeof MatesScalarFieldEnum]


  export const ShareScalarFieldEnum: {
    share_uuid: 'share_uuid',
    share_path: 'share_path',
    share_pass: 'share_pass',
    share_user: 'share_user',
    share_date: 'share_date',
    share_ends: 'share_ends',
    is_enabled: 'is_enabled'
  };

  export type ShareScalarFieldEnum = (typeof ShareScalarFieldEnum)[keyof typeof ShareScalarFieldEnum]


  export const TokenScalarFieldEnum: {
    token_uuid: 'token_uuid',
    token_path: 'token_path',
    token_user: 'token_user',
    token_type: 'token_type',
    token_info: 'token_info',
    is_enabled: 'is_enabled'
  };

  export type TokenScalarFieldEnum = (typeof TokenScalarFieldEnum)[keyof typeof TokenScalarFieldEnum]


  export const TasksScalarFieldEnum: {
    tasks_uuid: 'tasks_uuid',
    tasks_type: 'tasks_type',
    tasks_user: 'tasks_user',
    tasks_info: 'tasks_info',
    tasks_flag: 'tasks_flag'
  };

  export type TasksScalarFieldEnum = (typeof TasksScalarFieldEnum)[keyof typeof TasksScalarFieldEnum]


  export const FetchScalarFieldEnum: {
    fetch_uuid: 'fetch_uuid',
    fetch_from: 'fetch_from',
    fetch_dest: 'fetch_dest',
    fetch_user: 'fetch_user',
    fetch_flag: 'fetch_flag'
  };

  export type FetchScalarFieldEnum = (typeof FetchScalarFieldEnum)[keyof typeof FetchScalarFieldEnum]


  export const GroupScalarFieldEnum: {
    group_name: 'group_name',
    group_mask: 'group_mask',
    is_enabled: 'is_enabled'
  };

  export type GroupScalarFieldEnum = (typeof GroupScalarFieldEnum)[keyof typeof GroupScalarFieldEnum]


  export const CacheScalarFieldEnum: {
    cache_path: 'cache_path',
    cache_info: 'cache_info',
    cache_time: 'cache_time'
  };

  export type CacheScalarFieldEnum = (typeof CacheScalarFieldEnum)[keyof typeof CacheScalarFieldEnum]


  export const AdminScalarFieldEnum: {
    admin_keys: 'admin_keys',
    admin_data: 'admin_data'
  };

  export type AdminScalarFieldEnum = (typeof AdminScalarFieldEnum)[keyof typeof AdminScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    
  /**
   * Deep Input Types
   */


  export type mountWhereInput = {
    AND?: mountWhereInput | mountWhereInput[]
    OR?: mountWhereInput[]
    NOT?: mountWhereInput | mountWhereInput[]
    mount_path?: StringFilter<"mount"> | string
    mount_type?: StringFilter<"mount"> | string
    is_enabled?: IntFilter<"mount"> | number
    drive_conf?: StringNullableFilter<"mount"> | string | null
    drive_save?: StringNullableFilter<"mount"> | string | null
    cache_time?: IntNullableFilter<"mount"> | number | null
    index_list?: IntNullableFilter<"mount"> | number | null
    proxy_mode?: IntNullableFilter<"mount"> | number | null
    proxy_data?: StringNullableFilter<"mount"> | string | null
    drive_logs?: StringNullableFilter<"mount"> | string | null
    drive_tips?: StringNullableFilter<"mount"> | string | null
  }

  export type mountOrderByWithRelationInput = {
    mount_path?: SortOrder
    mount_type?: SortOrder
    is_enabled?: SortOrder
    drive_conf?: SortOrderInput | SortOrder
    drive_save?: SortOrderInput | SortOrder
    cache_time?: SortOrderInput | SortOrder
    index_list?: SortOrderInput | SortOrder
    proxy_mode?: SortOrderInput | SortOrder
    proxy_data?: SortOrderInput | SortOrder
    drive_logs?: SortOrderInput | SortOrder
    drive_tips?: SortOrderInput | SortOrder
  }

  export type mountWhereUniqueInput = Prisma.AtLeast<{
    mount_path?: string
    AND?: mountWhereInput | mountWhereInput[]
    OR?: mountWhereInput[]
    NOT?: mountWhereInput | mountWhereInput[]
    mount_type?: StringFilter<"mount"> | string
    is_enabled?: IntFilter<"mount"> | number
    drive_conf?: StringNullableFilter<"mount"> | string | null
    drive_save?: StringNullableFilter<"mount"> | string | null
    cache_time?: IntNullableFilter<"mount"> | number | null
    index_list?: IntNullableFilter<"mount"> | number | null
    proxy_mode?: IntNullableFilter<"mount"> | number | null
    proxy_data?: StringNullableFilter<"mount"> | string | null
    drive_logs?: StringNullableFilter<"mount"> | string | null
    drive_tips?: StringNullableFilter<"mount"> | string | null
  }, "mount_path" | "mount_path">

  export type mountOrderByWithAggregationInput = {
    mount_path?: SortOrder
    mount_type?: SortOrder
    is_enabled?: SortOrder
    drive_conf?: SortOrderInput | SortOrder
    drive_save?: SortOrderInput | SortOrder
    cache_time?: SortOrderInput | SortOrder
    index_list?: SortOrderInput | SortOrder
    proxy_mode?: SortOrderInput | SortOrder
    proxy_data?: SortOrderInput | SortOrder
    drive_logs?: SortOrderInput | SortOrder
    drive_tips?: SortOrderInput | SortOrder
    _count?: mountCountOrderByAggregateInput
    _avg?: mountAvgOrderByAggregateInput
    _max?: mountMaxOrderByAggregateInput
    _min?: mountMinOrderByAggregateInput
    _sum?: mountSumOrderByAggregateInput
  }

  export type mountScalarWhereWithAggregatesInput = {
    AND?: mountScalarWhereWithAggregatesInput | mountScalarWhereWithAggregatesInput[]
    OR?: mountScalarWhereWithAggregatesInput[]
    NOT?: mountScalarWhereWithAggregatesInput | mountScalarWhereWithAggregatesInput[]
    mount_path?: StringWithAggregatesFilter<"mount"> | string
    mount_type?: StringWithAggregatesFilter<"mount"> | string
    is_enabled?: IntWithAggregatesFilter<"mount"> | number
    drive_conf?: StringNullableWithAggregatesFilter<"mount"> | string | null
    drive_save?: StringNullableWithAggregatesFilter<"mount"> | string | null
    cache_time?: IntNullableWithAggregatesFilter<"mount"> | number | null
    index_list?: IntNullableWithAggregatesFilter<"mount"> | number | null
    proxy_mode?: IntNullableWithAggregatesFilter<"mount"> | number | null
    proxy_data?: StringNullableWithAggregatesFilter<"mount"> | string | null
    drive_logs?: StringNullableWithAggregatesFilter<"mount"> | string | null
    drive_tips?: StringNullableWithAggregatesFilter<"mount"> | string | null
  }

  export type usersWhereInput = {
    AND?: usersWhereInput | usersWhereInput[]
    OR?: usersWhereInput[]
    NOT?: usersWhereInput | usersWhereInput[]
    users_name?: StringFilter<"users"> | string
    users_mail?: StringFilter<"users"> | string
    users_pass?: StringFilter<"users"> | string
    users_mask?: StringFilter<"users"> | string
    is_enabled?: IntFilter<"users"> | number
    total_size?: IntNullableFilter<"users"> | number | null
    total_used?: IntNullableFilter<"users"> | number | null
    oauth_data?: StringNullableFilter<"users"> | string | null
    mount_data?: StringNullableFilter<"users"> | string | null
  }

  export type usersOrderByWithRelationInput = {
    users_name?: SortOrder
    users_mail?: SortOrder
    users_pass?: SortOrder
    users_mask?: SortOrder
    is_enabled?: SortOrder
    total_size?: SortOrderInput | SortOrder
    total_used?: SortOrderInput | SortOrder
    oauth_data?: SortOrderInput | SortOrder
    mount_data?: SortOrderInput | SortOrder
  }

  export type usersWhereUniqueInput = Prisma.AtLeast<{
    users_name?: string
    AND?: usersWhereInput | usersWhereInput[]
    OR?: usersWhereInput[]
    NOT?: usersWhereInput | usersWhereInput[]
    users_mail?: StringFilter<"users"> | string
    users_pass?: StringFilter<"users"> | string
    users_mask?: StringFilter<"users"> | string
    is_enabled?: IntFilter<"users"> | number
    total_size?: IntNullableFilter<"users"> | number | null
    total_used?: IntNullableFilter<"users"> | number | null
    oauth_data?: StringNullableFilter<"users"> | string | null
    mount_data?: StringNullableFilter<"users"> | string | null
  }, "users_name" | "users_name">

  export type usersOrderByWithAggregationInput = {
    users_name?: SortOrder
    users_mail?: SortOrder
    users_pass?: SortOrder
    users_mask?: SortOrder
    is_enabled?: SortOrder
    total_size?: SortOrderInput | SortOrder
    total_used?: SortOrderInput | SortOrder
    oauth_data?: SortOrderInput | SortOrder
    mount_data?: SortOrderInput | SortOrder
    _count?: usersCountOrderByAggregateInput
    _avg?: usersAvgOrderByAggregateInput
    _max?: usersMaxOrderByAggregateInput
    _min?: usersMinOrderByAggregateInput
    _sum?: usersSumOrderByAggregateInput
  }

  export type usersScalarWhereWithAggregatesInput = {
    AND?: usersScalarWhereWithAggregatesInput | usersScalarWhereWithAggregatesInput[]
    OR?: usersScalarWhereWithAggregatesInput[]
    NOT?: usersScalarWhereWithAggregatesInput | usersScalarWhereWithAggregatesInput[]
    users_name?: StringWithAggregatesFilter<"users"> | string
    users_mail?: StringWithAggregatesFilter<"users"> | string
    users_pass?: StringWithAggregatesFilter<"users"> | string
    users_mask?: StringWithAggregatesFilter<"users"> | string
    is_enabled?: IntWithAggregatesFilter<"users"> | number
    total_size?: IntNullableWithAggregatesFilter<"users"> | number | null
    total_used?: IntNullableWithAggregatesFilter<"users"> | number | null
    oauth_data?: StringNullableWithAggregatesFilter<"users"> | string | null
    mount_data?: StringNullableWithAggregatesFilter<"users"> | string | null
  }

  export type oauthWhereInput = {
    AND?: oauthWhereInput | oauthWhereInput[]
    OR?: oauthWhereInput[]
    NOT?: oauthWhereInput | oauthWhereInput[]
    oauth_name?: StringFilter<"oauth"> | string
    oauth_type?: StringFilter<"oauth"> | string
    oauth_data?: StringFilter<"oauth"> | string
    is_enabled?: IntFilter<"oauth"> | number
  }

  export type oauthOrderByWithRelationInput = {
    oauth_name?: SortOrder
    oauth_type?: SortOrder
    oauth_data?: SortOrder
    is_enabled?: SortOrder
  }

  export type oauthWhereUniqueInput = Prisma.AtLeast<{
    oauth_name?: string
    AND?: oauthWhereInput | oauthWhereInput[]
    OR?: oauthWhereInput[]
    NOT?: oauthWhereInput | oauthWhereInput[]
    oauth_type?: StringFilter<"oauth"> | string
    oauth_data?: StringFilter<"oauth"> | string
    is_enabled?: IntFilter<"oauth"> | number
  }, "oauth_name" | "oauth_name">

  export type oauthOrderByWithAggregationInput = {
    oauth_name?: SortOrder
    oauth_type?: SortOrder
    oauth_data?: SortOrder
    is_enabled?: SortOrder
    _count?: oauthCountOrderByAggregateInput
    _avg?: oauthAvgOrderByAggregateInput
    _max?: oauthMaxOrderByAggregateInput
    _min?: oauthMinOrderByAggregateInput
    _sum?: oauthSumOrderByAggregateInput
  }

  export type oauthScalarWhereWithAggregatesInput = {
    AND?: oauthScalarWhereWithAggregatesInput | oauthScalarWhereWithAggregatesInput[]
    OR?: oauthScalarWhereWithAggregatesInput[]
    NOT?: oauthScalarWhereWithAggregatesInput | oauthScalarWhereWithAggregatesInput[]
    oauth_name?: StringWithAggregatesFilter<"oauth"> | string
    oauth_type?: StringWithAggregatesFilter<"oauth"> | string
    oauth_data?: StringWithAggregatesFilter<"oauth"> | string
    is_enabled?: IntWithAggregatesFilter<"oauth"> | number
  }

  export type bindsWhereInput = {
    AND?: bindsWhereInput | bindsWhereInput[]
    OR?: bindsWhereInput[]
    NOT?: bindsWhereInput | bindsWhereInput[]
    oauth_uuid?: StringFilter<"binds"> | string
    oauth_name?: StringFilter<"binds"> | string
    binds_user?: StringFilter<"binds"> | string
    binds_data?: StringFilter<"binds"> | string
    is_enabled?: IntFilter<"binds"> | number
  }

  export type bindsOrderByWithRelationInput = {
    oauth_uuid?: SortOrder
    oauth_name?: SortOrder
    binds_user?: SortOrder
    binds_data?: SortOrder
    is_enabled?: SortOrder
  }

  export type bindsWhereUniqueInput = Prisma.AtLeast<{
    oauth_uuid?: string
    AND?: bindsWhereInput | bindsWhereInput[]
    OR?: bindsWhereInput[]
    NOT?: bindsWhereInput | bindsWhereInput[]
    oauth_name?: StringFilter<"binds"> | string
    binds_user?: StringFilter<"binds"> | string
    binds_data?: StringFilter<"binds"> | string
    is_enabled?: IntFilter<"binds"> | number
  }, "oauth_uuid" | "oauth_uuid">

  export type bindsOrderByWithAggregationInput = {
    oauth_uuid?: SortOrder
    oauth_name?: SortOrder
    binds_user?: SortOrder
    binds_data?: SortOrder
    is_enabled?: SortOrder
    _count?: bindsCountOrderByAggregateInput
    _avg?: bindsAvgOrderByAggregateInput
    _max?: bindsMaxOrderByAggregateInput
    _min?: bindsMinOrderByAggregateInput
    _sum?: bindsSumOrderByAggregateInput
  }

  export type bindsScalarWhereWithAggregatesInput = {
    AND?: bindsScalarWhereWithAggregatesInput | bindsScalarWhereWithAggregatesInput[]
    OR?: bindsScalarWhereWithAggregatesInput[]
    NOT?: bindsScalarWhereWithAggregatesInput | bindsScalarWhereWithAggregatesInput[]
    oauth_uuid?: StringWithAggregatesFilter<"binds"> | string
    oauth_name?: StringWithAggregatesFilter<"binds"> | string
    binds_user?: StringWithAggregatesFilter<"binds"> | string
    binds_data?: StringWithAggregatesFilter<"binds"> | string
    is_enabled?: IntWithAggregatesFilter<"binds"> | number
  }

  export type cryptWhereInput = {
    AND?: cryptWhereInput | cryptWhereInput[]
    OR?: cryptWhereInput[]
    NOT?: cryptWhereInput | cryptWhereInput[]
    crypt_name?: StringFilter<"crypt"> | string
    crypt_pass?: StringFilter<"crypt"> | string
    crypt_type?: IntFilter<"crypt"> | number
    crypt_mode?: IntFilter<"crypt"> | number
    is_enabled?: IntFilter<"crypt"> | number
    crypt_self?: IntNullableFilter<"crypt"> | number | null
    rands_pass?: IntNullableFilter<"crypt"> | number | null
    oauth_data?: StringNullableFilter<"crypt"> | string | null
    write_name?: StringNullableFilter<"crypt"> | string | null
  }

  export type cryptOrderByWithRelationInput = {
    crypt_name?: SortOrder
    crypt_pass?: SortOrder
    crypt_type?: SortOrder
    crypt_mode?: SortOrder
    is_enabled?: SortOrder
    crypt_self?: SortOrderInput | SortOrder
    rands_pass?: SortOrderInput | SortOrder
    oauth_data?: SortOrderInput | SortOrder
    write_name?: SortOrderInput | SortOrder
  }

  export type cryptWhereUniqueInput = Prisma.AtLeast<{
    crypt_name?: string
    AND?: cryptWhereInput | cryptWhereInput[]
    OR?: cryptWhereInput[]
    NOT?: cryptWhereInput | cryptWhereInput[]
    crypt_pass?: StringFilter<"crypt"> | string
    crypt_type?: IntFilter<"crypt"> | number
    crypt_mode?: IntFilter<"crypt"> | number
    is_enabled?: IntFilter<"crypt"> | number
    crypt_self?: IntNullableFilter<"crypt"> | number | null
    rands_pass?: IntNullableFilter<"crypt"> | number | null
    oauth_data?: StringNullableFilter<"crypt"> | string | null
    write_name?: StringNullableFilter<"crypt"> | string | null
  }, "crypt_name" | "crypt_name">

  export type cryptOrderByWithAggregationInput = {
    crypt_name?: SortOrder
    crypt_pass?: SortOrder
    crypt_type?: SortOrder
    crypt_mode?: SortOrder
    is_enabled?: SortOrder
    crypt_self?: SortOrderInput | SortOrder
    rands_pass?: SortOrderInput | SortOrder
    oauth_data?: SortOrderInput | SortOrder
    write_name?: SortOrderInput | SortOrder
    _count?: cryptCountOrderByAggregateInput
    _avg?: cryptAvgOrderByAggregateInput
    _max?: cryptMaxOrderByAggregateInput
    _min?: cryptMinOrderByAggregateInput
    _sum?: cryptSumOrderByAggregateInput
  }

  export type cryptScalarWhereWithAggregatesInput = {
    AND?: cryptScalarWhereWithAggregatesInput | cryptScalarWhereWithAggregatesInput[]
    OR?: cryptScalarWhereWithAggregatesInput[]
    NOT?: cryptScalarWhereWithAggregatesInput | cryptScalarWhereWithAggregatesInput[]
    crypt_name?: StringWithAggregatesFilter<"crypt"> | string
    crypt_pass?: StringWithAggregatesFilter<"crypt"> | string
    crypt_type?: IntWithAggregatesFilter<"crypt"> | number
    crypt_mode?: IntWithAggregatesFilter<"crypt"> | number
    is_enabled?: IntWithAggregatesFilter<"crypt"> | number
    crypt_self?: IntNullableWithAggregatesFilter<"crypt"> | number | null
    rands_pass?: IntNullableWithAggregatesFilter<"crypt"> | number | null
    oauth_data?: StringNullableWithAggregatesFilter<"crypt"> | string | null
    write_name?: StringNullableWithAggregatesFilter<"crypt"> | string | null
  }

  export type matesWhereInput = {
    AND?: matesWhereInput | matesWhereInput[]
    OR?: matesWhereInput[]
    NOT?: matesWhereInput | matesWhereInput[]
    mates_name?: StringFilter<"mates"> | string
    mates_mask?: IntFilter<"mates"> | number
    mates_user?: IntFilter<"mates"> | number
    is_enabled?: IntFilter<"mates"> | number
    dir_hidden?: IntNullableFilter<"mates"> | number | null
    dir_shared?: IntNullableFilter<"mates"> | number | null
    set_zipped?: StringNullableFilter<"mates"> | string | null
    set_parted?: StringNullableFilter<"mates"> | string | null
    crypt_name?: StringNullableFilter<"mates"> | string | null
    cache_time?: IntNullableFilter<"mates"> | number | null
  }

  export type matesOrderByWithRelationInput = {
    mates_name?: SortOrder
    mates_mask?: SortOrder
    mates_user?: SortOrder
    is_enabled?: SortOrder
    dir_hidden?: SortOrderInput | SortOrder
    dir_shared?: SortOrderInput | SortOrder
    set_zipped?: SortOrderInput | SortOrder
    set_parted?: SortOrderInput | SortOrder
    crypt_name?: SortOrderInput | SortOrder
    cache_time?: SortOrderInput | SortOrder
  }

  export type matesWhereUniqueInput = Prisma.AtLeast<{
    mates_name?: string
    AND?: matesWhereInput | matesWhereInput[]
    OR?: matesWhereInput[]
    NOT?: matesWhereInput | matesWhereInput[]
    mates_mask?: IntFilter<"mates"> | number
    mates_user?: IntFilter<"mates"> | number
    is_enabled?: IntFilter<"mates"> | number
    dir_hidden?: IntNullableFilter<"mates"> | number | null
    dir_shared?: IntNullableFilter<"mates"> | number | null
    set_zipped?: StringNullableFilter<"mates"> | string | null
    set_parted?: StringNullableFilter<"mates"> | string | null
    crypt_name?: StringNullableFilter<"mates"> | string | null
    cache_time?: IntNullableFilter<"mates"> | number | null
  }, "mates_name" | "mates_name">

  export type matesOrderByWithAggregationInput = {
    mates_name?: SortOrder
    mates_mask?: SortOrder
    mates_user?: SortOrder
    is_enabled?: SortOrder
    dir_hidden?: SortOrderInput | SortOrder
    dir_shared?: SortOrderInput | SortOrder
    set_zipped?: SortOrderInput | SortOrder
    set_parted?: SortOrderInput | SortOrder
    crypt_name?: SortOrderInput | SortOrder
    cache_time?: SortOrderInput | SortOrder
    _count?: matesCountOrderByAggregateInput
    _avg?: matesAvgOrderByAggregateInput
    _max?: matesMaxOrderByAggregateInput
    _min?: matesMinOrderByAggregateInput
    _sum?: matesSumOrderByAggregateInput
  }

  export type matesScalarWhereWithAggregatesInput = {
    AND?: matesScalarWhereWithAggregatesInput | matesScalarWhereWithAggregatesInput[]
    OR?: matesScalarWhereWithAggregatesInput[]
    NOT?: matesScalarWhereWithAggregatesInput | matesScalarWhereWithAggregatesInput[]
    mates_name?: StringWithAggregatesFilter<"mates"> | string
    mates_mask?: IntWithAggregatesFilter<"mates"> | number
    mates_user?: IntWithAggregatesFilter<"mates"> | number
    is_enabled?: IntWithAggregatesFilter<"mates"> | number
    dir_hidden?: IntNullableWithAggregatesFilter<"mates"> | number | null
    dir_shared?: IntNullableWithAggregatesFilter<"mates"> | number | null
    set_zipped?: StringNullableWithAggregatesFilter<"mates"> | string | null
    set_parted?: StringNullableWithAggregatesFilter<"mates"> | string | null
    crypt_name?: StringNullableWithAggregatesFilter<"mates"> | string | null
    cache_time?: IntNullableWithAggregatesFilter<"mates"> | number | null
  }

  export type shareWhereInput = {
    AND?: shareWhereInput | shareWhereInput[]
    OR?: shareWhereInput[]
    NOT?: shareWhereInput | shareWhereInput[]
    share_uuid?: StringFilter<"share"> | string
    share_path?: StringFilter<"share"> | string
    share_pass?: StringFilter<"share"> | string
    share_user?: StringFilter<"share"> | string
    share_date?: IntFilter<"share"> | number
    share_ends?: IntFilter<"share"> | number
    is_enabled?: IntFilter<"share"> | number
  }

  export type shareOrderByWithRelationInput = {
    share_uuid?: SortOrder
    share_path?: SortOrder
    share_pass?: SortOrder
    share_user?: SortOrder
    share_date?: SortOrder
    share_ends?: SortOrder
    is_enabled?: SortOrder
  }

  export type shareWhereUniqueInput = Prisma.AtLeast<{
    share_uuid?: string
    AND?: shareWhereInput | shareWhereInput[]
    OR?: shareWhereInput[]
    NOT?: shareWhereInput | shareWhereInput[]
    share_path?: StringFilter<"share"> | string
    share_pass?: StringFilter<"share"> | string
    share_user?: StringFilter<"share"> | string
    share_date?: IntFilter<"share"> | number
    share_ends?: IntFilter<"share"> | number
    is_enabled?: IntFilter<"share"> | number
  }, "share_uuid" | "share_uuid">

  export type shareOrderByWithAggregationInput = {
    share_uuid?: SortOrder
    share_path?: SortOrder
    share_pass?: SortOrder
    share_user?: SortOrder
    share_date?: SortOrder
    share_ends?: SortOrder
    is_enabled?: SortOrder
    _count?: shareCountOrderByAggregateInput
    _avg?: shareAvgOrderByAggregateInput
    _max?: shareMaxOrderByAggregateInput
    _min?: shareMinOrderByAggregateInput
    _sum?: shareSumOrderByAggregateInput
  }

  export type shareScalarWhereWithAggregatesInput = {
    AND?: shareScalarWhereWithAggregatesInput | shareScalarWhereWithAggregatesInput[]
    OR?: shareScalarWhereWithAggregatesInput[]
    NOT?: shareScalarWhereWithAggregatesInput | shareScalarWhereWithAggregatesInput[]
    share_uuid?: StringWithAggregatesFilter<"share"> | string
    share_path?: StringWithAggregatesFilter<"share"> | string
    share_pass?: StringWithAggregatesFilter<"share"> | string
    share_user?: StringWithAggregatesFilter<"share"> | string
    share_date?: IntWithAggregatesFilter<"share"> | number
    share_ends?: IntWithAggregatesFilter<"share"> | number
    is_enabled?: IntWithAggregatesFilter<"share"> | number
  }

  export type tokenWhereInput = {
    AND?: tokenWhereInput | tokenWhereInput[]
    OR?: tokenWhereInput[]
    NOT?: tokenWhereInput | tokenWhereInput[]
    token_uuid?: StringFilter<"token"> | string
    token_path?: StringFilter<"token"> | string
    token_user?: StringFilter<"token"> | string
    token_type?: StringFilter<"token"> | string
    token_info?: StringFilter<"token"> | string
    is_enabled?: IntFilter<"token"> | number
  }

  export type tokenOrderByWithRelationInput = {
    token_uuid?: SortOrder
    token_path?: SortOrder
    token_user?: SortOrder
    token_type?: SortOrder
    token_info?: SortOrder
    is_enabled?: SortOrder
  }

  export type tokenWhereUniqueInput = Prisma.AtLeast<{
    token_uuid?: string
    AND?: tokenWhereInput | tokenWhereInput[]
    OR?: tokenWhereInput[]
    NOT?: tokenWhereInput | tokenWhereInput[]
    token_path?: StringFilter<"token"> | string
    token_user?: StringFilter<"token"> | string
    token_type?: StringFilter<"token"> | string
    token_info?: StringFilter<"token"> | string
    is_enabled?: IntFilter<"token"> | number
  }, "token_uuid" | "token_uuid">

  export type tokenOrderByWithAggregationInput = {
    token_uuid?: SortOrder
    token_path?: SortOrder
    token_user?: SortOrder
    token_type?: SortOrder
    token_info?: SortOrder
    is_enabled?: SortOrder
    _count?: tokenCountOrderByAggregateInput
    _avg?: tokenAvgOrderByAggregateInput
    _max?: tokenMaxOrderByAggregateInput
    _min?: tokenMinOrderByAggregateInput
    _sum?: tokenSumOrderByAggregateInput
  }

  export type tokenScalarWhereWithAggregatesInput = {
    AND?: tokenScalarWhereWithAggregatesInput | tokenScalarWhereWithAggregatesInput[]
    OR?: tokenScalarWhereWithAggregatesInput[]
    NOT?: tokenScalarWhereWithAggregatesInput | tokenScalarWhereWithAggregatesInput[]
    token_uuid?: StringWithAggregatesFilter<"token"> | string
    token_path?: StringWithAggregatesFilter<"token"> | string
    token_user?: StringWithAggregatesFilter<"token"> | string
    token_type?: StringWithAggregatesFilter<"token"> | string
    token_info?: StringWithAggregatesFilter<"token"> | string
    is_enabled?: IntWithAggregatesFilter<"token"> | number
  }

  export type tasksWhereInput = {
    AND?: tasksWhereInput | tasksWhereInput[]
    OR?: tasksWhereInput[]
    NOT?: tasksWhereInput | tasksWhereInput[]
    tasks_uuid?: StringFilter<"tasks"> | string
    tasks_type?: StringFilter<"tasks"> | string
    tasks_user?: StringFilter<"tasks"> | string
    tasks_info?: StringFilter<"tasks"> | string
    tasks_flag?: IntFilter<"tasks"> | number
  }

  export type tasksOrderByWithRelationInput = {
    tasks_uuid?: SortOrder
    tasks_type?: SortOrder
    tasks_user?: SortOrder
    tasks_info?: SortOrder
    tasks_flag?: SortOrder
  }

  export type tasksWhereUniqueInput = Prisma.AtLeast<{
    tasks_uuid?: string
    AND?: tasksWhereInput | tasksWhereInput[]
    OR?: tasksWhereInput[]
    NOT?: tasksWhereInput | tasksWhereInput[]
    tasks_type?: StringFilter<"tasks"> | string
    tasks_user?: StringFilter<"tasks"> | string
    tasks_info?: StringFilter<"tasks"> | string
    tasks_flag?: IntFilter<"tasks"> | number
  }, "tasks_uuid" | "tasks_uuid">

  export type tasksOrderByWithAggregationInput = {
    tasks_uuid?: SortOrder
    tasks_type?: SortOrder
    tasks_user?: SortOrder
    tasks_info?: SortOrder
    tasks_flag?: SortOrder
    _count?: tasksCountOrderByAggregateInput
    _avg?: tasksAvgOrderByAggregateInput
    _max?: tasksMaxOrderByAggregateInput
    _min?: tasksMinOrderByAggregateInput
    _sum?: tasksSumOrderByAggregateInput
  }

  export type tasksScalarWhereWithAggregatesInput = {
    AND?: tasksScalarWhereWithAggregatesInput | tasksScalarWhereWithAggregatesInput[]
    OR?: tasksScalarWhereWithAggregatesInput[]
    NOT?: tasksScalarWhereWithAggregatesInput | tasksScalarWhereWithAggregatesInput[]
    tasks_uuid?: StringWithAggregatesFilter<"tasks"> | string
    tasks_type?: StringWithAggregatesFilter<"tasks"> | string
    tasks_user?: StringWithAggregatesFilter<"tasks"> | string
    tasks_info?: StringWithAggregatesFilter<"tasks"> | string
    tasks_flag?: IntWithAggregatesFilter<"tasks"> | number
  }

  export type fetchWhereInput = {
    AND?: fetchWhereInput | fetchWhereInput[]
    OR?: fetchWhereInput[]
    NOT?: fetchWhereInput | fetchWhereInput[]
    fetch_uuid?: StringFilter<"fetch"> | string
    fetch_from?: StringFilter<"fetch"> | string
    fetch_dest?: StringFilter<"fetch"> | string
    fetch_user?: StringFilter<"fetch"> | string
    fetch_flag?: IntFilter<"fetch"> | number
  }

  export type fetchOrderByWithRelationInput = {
    fetch_uuid?: SortOrder
    fetch_from?: SortOrder
    fetch_dest?: SortOrder
    fetch_user?: SortOrder
    fetch_flag?: SortOrder
  }

  export type fetchWhereUniqueInput = Prisma.AtLeast<{
    fetch_uuid?: string
    AND?: fetchWhereInput | fetchWhereInput[]
    OR?: fetchWhereInput[]
    NOT?: fetchWhereInput | fetchWhereInput[]
    fetch_from?: StringFilter<"fetch"> | string
    fetch_dest?: StringFilter<"fetch"> | string
    fetch_user?: StringFilter<"fetch"> | string
    fetch_flag?: IntFilter<"fetch"> | number
  }, "fetch_uuid" | "fetch_uuid">

  export type fetchOrderByWithAggregationInput = {
    fetch_uuid?: SortOrder
    fetch_from?: SortOrder
    fetch_dest?: SortOrder
    fetch_user?: SortOrder
    fetch_flag?: SortOrder
    _count?: fetchCountOrderByAggregateInput
    _avg?: fetchAvgOrderByAggregateInput
    _max?: fetchMaxOrderByAggregateInput
    _min?: fetchMinOrderByAggregateInput
    _sum?: fetchSumOrderByAggregateInput
  }

  export type fetchScalarWhereWithAggregatesInput = {
    AND?: fetchScalarWhereWithAggregatesInput | fetchScalarWhereWithAggregatesInput[]
    OR?: fetchScalarWhereWithAggregatesInput[]
    NOT?: fetchScalarWhereWithAggregatesInput | fetchScalarWhereWithAggregatesInput[]
    fetch_uuid?: StringWithAggregatesFilter<"fetch"> | string
    fetch_from?: StringWithAggregatesFilter<"fetch"> | string
    fetch_dest?: StringWithAggregatesFilter<"fetch"> | string
    fetch_user?: StringWithAggregatesFilter<"fetch"> | string
    fetch_flag?: IntWithAggregatesFilter<"fetch"> | number
  }

  export type groupWhereInput = {
    AND?: groupWhereInput | groupWhereInput[]
    OR?: groupWhereInput[]
    NOT?: groupWhereInput | groupWhereInput[]
    group_name?: StringFilter<"group"> | string
    group_mask?: StringFilter<"group"> | string
    is_enabled?: IntFilter<"group"> | number
  }

  export type groupOrderByWithRelationInput = {
    group_name?: SortOrder
    group_mask?: SortOrder
    is_enabled?: SortOrder
  }

  export type groupWhereUniqueInput = Prisma.AtLeast<{
    group_name?: string
    AND?: groupWhereInput | groupWhereInput[]
    OR?: groupWhereInput[]
    NOT?: groupWhereInput | groupWhereInput[]
    group_mask?: StringFilter<"group"> | string
    is_enabled?: IntFilter<"group"> | number
  }, "group_name" | "group_name">

  export type groupOrderByWithAggregationInput = {
    group_name?: SortOrder
    group_mask?: SortOrder
    is_enabled?: SortOrder
    _count?: groupCountOrderByAggregateInput
    _avg?: groupAvgOrderByAggregateInput
    _max?: groupMaxOrderByAggregateInput
    _min?: groupMinOrderByAggregateInput
    _sum?: groupSumOrderByAggregateInput
  }

  export type groupScalarWhereWithAggregatesInput = {
    AND?: groupScalarWhereWithAggregatesInput | groupScalarWhereWithAggregatesInput[]
    OR?: groupScalarWhereWithAggregatesInput[]
    NOT?: groupScalarWhereWithAggregatesInput | groupScalarWhereWithAggregatesInput[]
    group_name?: StringWithAggregatesFilter<"group"> | string
    group_mask?: StringWithAggregatesFilter<"group"> | string
    is_enabled?: IntWithAggregatesFilter<"group"> | number
  }

  export type cacheWhereInput = {
    AND?: cacheWhereInput | cacheWhereInput[]
    OR?: cacheWhereInput[]
    NOT?: cacheWhereInput | cacheWhereInput[]
    cache_path?: StringFilter<"cache"> | string
    cache_info?: IntNullableFilter<"cache"> | number | null
    cache_time?: IntNullableFilter<"cache"> | number | null
  }

  export type cacheOrderByWithRelationInput = {
    cache_path?: SortOrder
    cache_info?: SortOrderInput | SortOrder
    cache_time?: SortOrderInput | SortOrder
  }

  export type cacheWhereUniqueInput = Prisma.AtLeast<{
    cache_path?: string
    AND?: cacheWhereInput | cacheWhereInput[]
    OR?: cacheWhereInput[]
    NOT?: cacheWhereInput | cacheWhereInput[]
    cache_info?: IntNullableFilter<"cache"> | number | null
    cache_time?: IntNullableFilter<"cache"> | number | null
  }, "cache_path" | "cache_path">

  export type cacheOrderByWithAggregationInput = {
    cache_path?: SortOrder
    cache_info?: SortOrderInput | SortOrder
    cache_time?: SortOrderInput | SortOrder
    _count?: cacheCountOrderByAggregateInput
    _avg?: cacheAvgOrderByAggregateInput
    _max?: cacheMaxOrderByAggregateInput
    _min?: cacheMinOrderByAggregateInput
    _sum?: cacheSumOrderByAggregateInput
  }

  export type cacheScalarWhereWithAggregatesInput = {
    AND?: cacheScalarWhereWithAggregatesInput | cacheScalarWhereWithAggregatesInput[]
    OR?: cacheScalarWhereWithAggregatesInput[]
    NOT?: cacheScalarWhereWithAggregatesInput | cacheScalarWhereWithAggregatesInput[]
    cache_path?: StringWithAggregatesFilter<"cache"> | string
    cache_info?: IntNullableWithAggregatesFilter<"cache"> | number | null
    cache_time?: IntNullableWithAggregatesFilter<"cache"> | number | null
  }

  export type adminWhereInput = {
    AND?: adminWhereInput | adminWhereInput[]
    OR?: adminWhereInput[]
    NOT?: adminWhereInput | adminWhereInput[]
    admin_keys?: StringFilter<"admin"> | string
    admin_data?: StringFilter<"admin"> | string
  }

  export type adminOrderByWithRelationInput = {
    admin_keys?: SortOrder
    admin_data?: SortOrder
  }

  export type adminWhereUniqueInput = Prisma.AtLeast<{
    admin_keys?: string
    AND?: adminWhereInput | adminWhereInput[]
    OR?: adminWhereInput[]
    NOT?: adminWhereInput | adminWhereInput[]
    admin_data?: StringFilter<"admin"> | string
  }, "admin_keys" | "admin_keys">

  export type adminOrderByWithAggregationInput = {
    admin_keys?: SortOrder
    admin_data?: SortOrder
    _count?: adminCountOrderByAggregateInput
    _max?: adminMaxOrderByAggregateInput
    _min?: adminMinOrderByAggregateInput
  }

  export type adminScalarWhereWithAggregatesInput = {
    AND?: adminScalarWhereWithAggregatesInput | adminScalarWhereWithAggregatesInput[]
    OR?: adminScalarWhereWithAggregatesInput[]
    NOT?: adminScalarWhereWithAggregatesInput | adminScalarWhereWithAggregatesInput[]
    admin_keys?: StringWithAggregatesFilter<"admin"> | string
    admin_data?: StringWithAggregatesFilter<"admin"> | string
  }

  export type mountCreateInput = {
    mount_path: string
    mount_type: string
    is_enabled: number
    drive_conf?: string | null
    drive_save?: string | null
    cache_time?: number | null
    index_list?: number | null
    proxy_mode?: number | null
    proxy_data?: string | null
    drive_logs?: string | null
    drive_tips?: string | null
  }

  export type mountUncheckedCreateInput = {
    mount_path: string
    mount_type: string
    is_enabled: number
    drive_conf?: string | null
    drive_save?: string | null
    cache_time?: number | null
    index_list?: number | null
    proxy_mode?: number | null
    proxy_data?: string | null
    drive_logs?: string | null
    drive_tips?: string | null
  }

  export type mountUpdateInput = {
    mount_path?: StringFieldUpdateOperationsInput | string
    mount_type?: StringFieldUpdateOperationsInput | string
    is_enabled?: IntFieldUpdateOperationsInput | number
    drive_conf?: NullableStringFieldUpdateOperationsInput | string | null
    drive_save?: NullableStringFieldUpdateOperationsInput | string | null
    cache_time?: NullableIntFieldUpdateOperationsInput | number | null
    index_list?: NullableIntFieldUpdateOperationsInput | number | null
    proxy_mode?: NullableIntFieldUpdateOperationsInput | number | null
    proxy_data?: NullableStringFieldUpdateOperationsInput | string | null
    drive_logs?: NullableStringFieldUpdateOperationsInput | string | null
    drive_tips?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type mountUncheckedUpdateInput = {
    mount_path?: StringFieldUpdateOperationsInput | string
    mount_type?: StringFieldUpdateOperationsInput | string
    is_enabled?: IntFieldUpdateOperationsInput | number
    drive_conf?: NullableStringFieldUpdateOperationsInput | string | null
    drive_save?: NullableStringFieldUpdateOperationsInput | string | null
    cache_time?: NullableIntFieldUpdateOperationsInput | number | null
    index_list?: NullableIntFieldUpdateOperationsInput | number | null
    proxy_mode?: NullableIntFieldUpdateOperationsInput | number | null
    proxy_data?: NullableStringFieldUpdateOperationsInput | string | null
    drive_logs?: NullableStringFieldUpdateOperationsInput | string | null
    drive_tips?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type mountCreateManyInput = {
    mount_path: string
    mount_type: string
    is_enabled: number
    drive_conf?: string | null
    drive_save?: string | null
    cache_time?: number | null
    index_list?: number | null
    proxy_mode?: number | null
    proxy_data?: string | null
    drive_logs?: string | null
    drive_tips?: string | null
  }

  export type mountUpdateManyMutationInput = {
    mount_path?: StringFieldUpdateOperationsInput | string
    mount_type?: StringFieldUpdateOperationsInput | string
    is_enabled?: IntFieldUpdateOperationsInput | number
    drive_conf?: NullableStringFieldUpdateOperationsInput | string | null
    drive_save?: NullableStringFieldUpdateOperationsInput | string | null
    cache_time?: NullableIntFieldUpdateOperationsInput | number | null
    index_list?: NullableIntFieldUpdateOperationsInput | number | null
    proxy_mode?: NullableIntFieldUpdateOperationsInput | number | null
    proxy_data?: NullableStringFieldUpdateOperationsInput | string | null
    drive_logs?: NullableStringFieldUpdateOperationsInput | string | null
    drive_tips?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type mountUncheckedUpdateManyInput = {
    mount_path?: StringFieldUpdateOperationsInput | string
    mount_type?: StringFieldUpdateOperationsInput | string
    is_enabled?: IntFieldUpdateOperationsInput | number
    drive_conf?: NullableStringFieldUpdateOperationsInput | string | null
    drive_save?: NullableStringFieldUpdateOperationsInput | string | null
    cache_time?: NullableIntFieldUpdateOperationsInput | number | null
    index_list?: NullableIntFieldUpdateOperationsInput | number | null
    proxy_mode?: NullableIntFieldUpdateOperationsInput | number | null
    proxy_data?: NullableStringFieldUpdateOperationsInput | string | null
    drive_logs?: NullableStringFieldUpdateOperationsInput | string | null
    drive_tips?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type usersCreateInput = {
    users_name: string
    users_mail: string
    users_pass: string
    users_mask: string
    is_enabled: number
    total_size?: number | null
    total_used?: number | null
    oauth_data?: string | null
    mount_data?: string | null
  }

  export type usersUncheckedCreateInput = {
    users_name: string
    users_mail: string
    users_pass: string
    users_mask: string
    is_enabled: number
    total_size?: number | null
    total_used?: number | null
    oauth_data?: string | null
    mount_data?: string | null
  }

  export type usersUpdateInput = {
    users_name?: StringFieldUpdateOperationsInput | string
    users_mail?: StringFieldUpdateOperationsInput | string
    users_pass?: StringFieldUpdateOperationsInput | string
    users_mask?: StringFieldUpdateOperationsInput | string
    is_enabled?: IntFieldUpdateOperationsInput | number
    total_size?: NullableIntFieldUpdateOperationsInput | number | null
    total_used?: NullableIntFieldUpdateOperationsInput | number | null
    oauth_data?: NullableStringFieldUpdateOperationsInput | string | null
    mount_data?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type usersUncheckedUpdateInput = {
    users_name?: StringFieldUpdateOperationsInput | string
    users_mail?: StringFieldUpdateOperationsInput | string
    users_pass?: StringFieldUpdateOperationsInput | string
    users_mask?: StringFieldUpdateOperationsInput | string
    is_enabled?: IntFieldUpdateOperationsInput | number
    total_size?: NullableIntFieldUpdateOperationsInput | number | null
    total_used?: NullableIntFieldUpdateOperationsInput | number | null
    oauth_data?: NullableStringFieldUpdateOperationsInput | string | null
    mount_data?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type usersCreateManyInput = {
    users_name: string
    users_mail: string
    users_pass: string
    users_mask: string
    is_enabled: number
    total_size?: number | null
    total_used?: number | null
    oauth_data?: string | null
    mount_data?: string | null
  }

  export type usersUpdateManyMutationInput = {
    users_name?: StringFieldUpdateOperationsInput | string
    users_mail?: StringFieldUpdateOperationsInput | string
    users_pass?: StringFieldUpdateOperationsInput | string
    users_mask?: StringFieldUpdateOperationsInput | string
    is_enabled?: IntFieldUpdateOperationsInput | number
    total_size?: NullableIntFieldUpdateOperationsInput | number | null
    total_used?: NullableIntFieldUpdateOperationsInput | number | null
    oauth_data?: NullableStringFieldUpdateOperationsInput | string | null
    mount_data?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type usersUncheckedUpdateManyInput = {
    users_name?: StringFieldUpdateOperationsInput | string
    users_mail?: StringFieldUpdateOperationsInput | string
    users_pass?: StringFieldUpdateOperationsInput | string
    users_mask?: StringFieldUpdateOperationsInput | string
    is_enabled?: IntFieldUpdateOperationsInput | number
    total_size?: NullableIntFieldUpdateOperationsInput | number | null
    total_used?: NullableIntFieldUpdateOperationsInput | number | null
    oauth_data?: NullableStringFieldUpdateOperationsInput | string | null
    mount_data?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type oauthCreateInput = {
    oauth_name: string
    oauth_type: string
    oauth_data: string
    is_enabled: number
  }

  export type oauthUncheckedCreateInput = {
    oauth_name: string
    oauth_type: string
    oauth_data: string
    is_enabled: number
  }

  export type oauthUpdateInput = {
    oauth_name?: StringFieldUpdateOperationsInput | string
    oauth_type?: StringFieldUpdateOperationsInput | string
    oauth_data?: StringFieldUpdateOperationsInput | string
    is_enabled?: IntFieldUpdateOperationsInput | number
  }

  export type oauthUncheckedUpdateInput = {
    oauth_name?: StringFieldUpdateOperationsInput | string
    oauth_type?: StringFieldUpdateOperationsInput | string
    oauth_data?: StringFieldUpdateOperationsInput | string
    is_enabled?: IntFieldUpdateOperationsInput | number
  }

  export type oauthCreateManyInput = {
    oauth_name: string
    oauth_type: string
    oauth_data: string
    is_enabled: number
  }

  export type oauthUpdateManyMutationInput = {
    oauth_name?: StringFieldUpdateOperationsInput | string
    oauth_type?: StringFieldUpdateOperationsInput | string
    oauth_data?: StringFieldUpdateOperationsInput | string
    is_enabled?: IntFieldUpdateOperationsInput | number
  }

  export type oauthUncheckedUpdateManyInput = {
    oauth_name?: StringFieldUpdateOperationsInput | string
    oauth_type?: StringFieldUpdateOperationsInput | string
    oauth_data?: StringFieldUpdateOperationsInput | string
    is_enabled?: IntFieldUpdateOperationsInput | number
  }

  export type bindsCreateInput = {
    oauth_uuid: string
    oauth_name: string
    binds_user: string
    binds_data: string
    is_enabled: number
  }

  export type bindsUncheckedCreateInput = {
    oauth_uuid: string
    oauth_name: string
    binds_user: string
    binds_data: string
    is_enabled: number
  }

  export type bindsUpdateInput = {
    oauth_uuid?: StringFieldUpdateOperationsInput | string
    oauth_name?: StringFieldUpdateOperationsInput | string
    binds_user?: StringFieldUpdateOperationsInput | string
    binds_data?: StringFieldUpdateOperationsInput | string
    is_enabled?: IntFieldUpdateOperationsInput | number
  }

  export type bindsUncheckedUpdateInput = {
    oauth_uuid?: StringFieldUpdateOperationsInput | string
    oauth_name?: StringFieldUpdateOperationsInput | string
    binds_user?: StringFieldUpdateOperationsInput | string
    binds_data?: StringFieldUpdateOperationsInput | string
    is_enabled?: IntFieldUpdateOperationsInput | number
  }

  export type bindsCreateManyInput = {
    oauth_uuid: string
    oauth_name: string
    binds_user: string
    binds_data: string
    is_enabled: number
  }

  export type bindsUpdateManyMutationInput = {
    oauth_uuid?: StringFieldUpdateOperationsInput | string
    oauth_name?: StringFieldUpdateOperationsInput | string
    binds_user?: StringFieldUpdateOperationsInput | string
    binds_data?: StringFieldUpdateOperationsInput | string
    is_enabled?: IntFieldUpdateOperationsInput | number
  }

  export type bindsUncheckedUpdateManyInput = {
    oauth_uuid?: StringFieldUpdateOperationsInput | string
    oauth_name?: StringFieldUpdateOperationsInput | string
    binds_user?: StringFieldUpdateOperationsInput | string
    binds_data?: StringFieldUpdateOperationsInput | string
    is_enabled?: IntFieldUpdateOperationsInput | number
  }

  export type cryptCreateInput = {
    crypt_name: string
    crypt_pass: string
    crypt_type: number
    crypt_mode: number
    is_enabled: number
    crypt_self?: number | null
    rands_pass?: number | null
    oauth_data?: string | null
    write_name?: string | null
  }

  export type cryptUncheckedCreateInput = {
    crypt_name: string
    crypt_pass: string
    crypt_type: number
    crypt_mode: number
    is_enabled: number
    crypt_self?: number | null
    rands_pass?: number | null
    oauth_data?: string | null
    write_name?: string | null
  }

  export type cryptUpdateInput = {
    crypt_name?: StringFieldUpdateOperationsInput | string
    crypt_pass?: StringFieldUpdateOperationsInput | string
    crypt_type?: IntFieldUpdateOperationsInput | number
    crypt_mode?: IntFieldUpdateOperationsInput | number
    is_enabled?: IntFieldUpdateOperationsInput | number
    crypt_self?: NullableIntFieldUpdateOperationsInput | number | null
    rands_pass?: NullableIntFieldUpdateOperationsInput | number | null
    oauth_data?: NullableStringFieldUpdateOperationsInput | string | null
    write_name?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type cryptUncheckedUpdateInput = {
    crypt_name?: StringFieldUpdateOperationsInput | string
    crypt_pass?: StringFieldUpdateOperationsInput | string
    crypt_type?: IntFieldUpdateOperationsInput | number
    crypt_mode?: IntFieldUpdateOperationsInput | number
    is_enabled?: IntFieldUpdateOperationsInput | number
    crypt_self?: NullableIntFieldUpdateOperationsInput | number | null
    rands_pass?: NullableIntFieldUpdateOperationsInput | number | null
    oauth_data?: NullableStringFieldUpdateOperationsInput | string | null
    write_name?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type cryptCreateManyInput = {
    crypt_name: string
    crypt_pass: string
    crypt_type: number
    crypt_mode: number
    is_enabled: number
    crypt_self?: number | null
    rands_pass?: number | null
    oauth_data?: string | null
    write_name?: string | null
  }

  export type cryptUpdateManyMutationInput = {
    crypt_name?: StringFieldUpdateOperationsInput | string
    crypt_pass?: StringFieldUpdateOperationsInput | string
    crypt_type?: IntFieldUpdateOperationsInput | number
    crypt_mode?: IntFieldUpdateOperationsInput | number
    is_enabled?: IntFieldUpdateOperationsInput | number
    crypt_self?: NullableIntFieldUpdateOperationsInput | number | null
    rands_pass?: NullableIntFieldUpdateOperationsInput | number | null
    oauth_data?: NullableStringFieldUpdateOperationsInput | string | null
    write_name?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type cryptUncheckedUpdateManyInput = {
    crypt_name?: StringFieldUpdateOperationsInput | string
    crypt_pass?: StringFieldUpdateOperationsInput | string
    crypt_type?: IntFieldUpdateOperationsInput | number
    crypt_mode?: IntFieldUpdateOperationsInput | number
    is_enabled?: IntFieldUpdateOperationsInput | number
    crypt_self?: NullableIntFieldUpdateOperationsInput | number | null
    rands_pass?: NullableIntFieldUpdateOperationsInput | number | null
    oauth_data?: NullableStringFieldUpdateOperationsInput | string | null
    write_name?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type matesCreateInput = {
    mates_name: string
    mates_mask: number
    mates_user: number
    is_enabled: number
    dir_hidden?: number | null
    dir_shared?: number | null
    set_zipped?: string | null
    set_parted?: string | null
    crypt_name?: string | null
    cache_time?: number | null
  }

  export type matesUncheckedCreateInput = {
    mates_name: string
    mates_mask: number
    mates_user: number
    is_enabled: number
    dir_hidden?: number | null
    dir_shared?: number | null
    set_zipped?: string | null
    set_parted?: string | null
    crypt_name?: string | null
    cache_time?: number | null
  }

  export type matesUpdateInput = {
    mates_name?: StringFieldUpdateOperationsInput | string
    mates_mask?: IntFieldUpdateOperationsInput | number
    mates_user?: IntFieldUpdateOperationsInput | number
    is_enabled?: IntFieldUpdateOperationsInput | number
    dir_hidden?: NullableIntFieldUpdateOperationsInput | number | null
    dir_shared?: NullableIntFieldUpdateOperationsInput | number | null
    set_zipped?: NullableStringFieldUpdateOperationsInput | string | null
    set_parted?: NullableStringFieldUpdateOperationsInput | string | null
    crypt_name?: NullableStringFieldUpdateOperationsInput | string | null
    cache_time?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type matesUncheckedUpdateInput = {
    mates_name?: StringFieldUpdateOperationsInput | string
    mates_mask?: IntFieldUpdateOperationsInput | number
    mates_user?: IntFieldUpdateOperationsInput | number
    is_enabled?: IntFieldUpdateOperationsInput | number
    dir_hidden?: NullableIntFieldUpdateOperationsInput | number | null
    dir_shared?: NullableIntFieldUpdateOperationsInput | number | null
    set_zipped?: NullableStringFieldUpdateOperationsInput | string | null
    set_parted?: NullableStringFieldUpdateOperationsInput | string | null
    crypt_name?: NullableStringFieldUpdateOperationsInput | string | null
    cache_time?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type matesCreateManyInput = {
    mates_name: string
    mates_mask: number
    mates_user: number
    is_enabled: number
    dir_hidden?: number | null
    dir_shared?: number | null
    set_zipped?: string | null
    set_parted?: string | null
    crypt_name?: string | null
    cache_time?: number | null
  }

  export type matesUpdateManyMutationInput = {
    mates_name?: StringFieldUpdateOperationsInput | string
    mates_mask?: IntFieldUpdateOperationsInput | number
    mates_user?: IntFieldUpdateOperationsInput | number
    is_enabled?: IntFieldUpdateOperationsInput | number
    dir_hidden?: NullableIntFieldUpdateOperationsInput | number | null
    dir_shared?: NullableIntFieldUpdateOperationsInput | number | null
    set_zipped?: NullableStringFieldUpdateOperationsInput | string | null
    set_parted?: NullableStringFieldUpdateOperationsInput | string | null
    crypt_name?: NullableStringFieldUpdateOperationsInput | string | null
    cache_time?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type matesUncheckedUpdateManyInput = {
    mates_name?: StringFieldUpdateOperationsInput | string
    mates_mask?: IntFieldUpdateOperationsInput | number
    mates_user?: IntFieldUpdateOperationsInput | number
    is_enabled?: IntFieldUpdateOperationsInput | number
    dir_hidden?: NullableIntFieldUpdateOperationsInput | number | null
    dir_shared?: NullableIntFieldUpdateOperationsInput | number | null
    set_zipped?: NullableStringFieldUpdateOperationsInput | string | null
    set_parted?: NullableStringFieldUpdateOperationsInput | string | null
    crypt_name?: NullableStringFieldUpdateOperationsInput | string | null
    cache_time?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type shareCreateInput = {
    share_uuid: string
    share_path: string
    share_pass: string
    share_user: string
    share_date: number
    share_ends: number
    is_enabled: number
  }

  export type shareUncheckedCreateInput = {
    share_uuid: string
    share_path: string
    share_pass: string
    share_user: string
    share_date: number
    share_ends: number
    is_enabled: number
  }

  export type shareUpdateInput = {
    share_uuid?: StringFieldUpdateOperationsInput | string
    share_path?: StringFieldUpdateOperationsInput | string
    share_pass?: StringFieldUpdateOperationsInput | string
    share_user?: StringFieldUpdateOperationsInput | string
    share_date?: IntFieldUpdateOperationsInput | number
    share_ends?: IntFieldUpdateOperationsInput | number
    is_enabled?: IntFieldUpdateOperationsInput | number
  }

  export type shareUncheckedUpdateInput = {
    share_uuid?: StringFieldUpdateOperationsInput | string
    share_path?: StringFieldUpdateOperationsInput | string
    share_pass?: StringFieldUpdateOperationsInput | string
    share_user?: StringFieldUpdateOperationsInput | string
    share_date?: IntFieldUpdateOperationsInput | number
    share_ends?: IntFieldUpdateOperationsInput | number
    is_enabled?: IntFieldUpdateOperationsInput | number
  }

  export type shareCreateManyInput = {
    share_uuid: string
    share_path: string
    share_pass: string
    share_user: string
    share_date: number
    share_ends: number
    is_enabled: number
  }

  export type shareUpdateManyMutationInput = {
    share_uuid?: StringFieldUpdateOperationsInput | string
    share_path?: StringFieldUpdateOperationsInput | string
    share_pass?: StringFieldUpdateOperationsInput | string
    share_user?: StringFieldUpdateOperationsInput | string
    share_date?: IntFieldUpdateOperationsInput | number
    share_ends?: IntFieldUpdateOperationsInput | number
    is_enabled?: IntFieldUpdateOperationsInput | number
  }

  export type shareUncheckedUpdateManyInput = {
    share_uuid?: StringFieldUpdateOperationsInput | string
    share_path?: StringFieldUpdateOperationsInput | string
    share_pass?: StringFieldUpdateOperationsInput | string
    share_user?: StringFieldUpdateOperationsInput | string
    share_date?: IntFieldUpdateOperationsInput | number
    share_ends?: IntFieldUpdateOperationsInput | number
    is_enabled?: IntFieldUpdateOperationsInput | number
  }

  export type tokenCreateInput = {
    token_uuid: string
    token_path: string
    token_user: string
    token_type: string
    token_info: string
    is_enabled: number
  }

  export type tokenUncheckedCreateInput = {
    token_uuid: string
    token_path: string
    token_user: string
    token_type: string
    token_info: string
    is_enabled: number
  }

  export type tokenUpdateInput = {
    token_uuid?: StringFieldUpdateOperationsInput | string
    token_path?: StringFieldUpdateOperationsInput | string
    token_user?: StringFieldUpdateOperationsInput | string
    token_type?: StringFieldUpdateOperationsInput | string
    token_info?: StringFieldUpdateOperationsInput | string
    is_enabled?: IntFieldUpdateOperationsInput | number
  }

  export type tokenUncheckedUpdateInput = {
    token_uuid?: StringFieldUpdateOperationsInput | string
    token_path?: StringFieldUpdateOperationsInput | string
    token_user?: StringFieldUpdateOperationsInput | string
    token_type?: StringFieldUpdateOperationsInput | string
    token_info?: StringFieldUpdateOperationsInput | string
    is_enabled?: IntFieldUpdateOperationsInput | number
  }

  export type tokenCreateManyInput = {
    token_uuid: string
    token_path: string
    token_user: string
    token_type: string
    token_info: string
    is_enabled: number
  }

  export type tokenUpdateManyMutationInput = {
    token_uuid?: StringFieldUpdateOperationsInput | string
    token_path?: StringFieldUpdateOperationsInput | string
    token_user?: StringFieldUpdateOperationsInput | string
    token_type?: StringFieldUpdateOperationsInput | string
    token_info?: StringFieldUpdateOperationsInput | string
    is_enabled?: IntFieldUpdateOperationsInput | number
  }

  export type tokenUncheckedUpdateManyInput = {
    token_uuid?: StringFieldUpdateOperationsInput | string
    token_path?: StringFieldUpdateOperationsInput | string
    token_user?: StringFieldUpdateOperationsInput | string
    token_type?: StringFieldUpdateOperationsInput | string
    token_info?: StringFieldUpdateOperationsInput | string
    is_enabled?: IntFieldUpdateOperationsInput | number
  }

  export type tasksCreateInput = {
    tasks_uuid: string
    tasks_type: string
    tasks_user: string
    tasks_info: string
    tasks_flag: number
  }

  export type tasksUncheckedCreateInput = {
    tasks_uuid: string
    tasks_type: string
    tasks_user: string
    tasks_info: string
    tasks_flag: number
  }

  export type tasksUpdateInput = {
    tasks_uuid?: StringFieldUpdateOperationsInput | string
    tasks_type?: StringFieldUpdateOperationsInput | string
    tasks_user?: StringFieldUpdateOperationsInput | string
    tasks_info?: StringFieldUpdateOperationsInput | string
    tasks_flag?: IntFieldUpdateOperationsInput | number
  }

  export type tasksUncheckedUpdateInput = {
    tasks_uuid?: StringFieldUpdateOperationsInput | string
    tasks_type?: StringFieldUpdateOperationsInput | string
    tasks_user?: StringFieldUpdateOperationsInput | string
    tasks_info?: StringFieldUpdateOperationsInput | string
    tasks_flag?: IntFieldUpdateOperationsInput | number
  }

  export type tasksCreateManyInput = {
    tasks_uuid: string
    tasks_type: string
    tasks_user: string
    tasks_info: string
    tasks_flag: number
  }

  export type tasksUpdateManyMutationInput = {
    tasks_uuid?: StringFieldUpdateOperationsInput | string
    tasks_type?: StringFieldUpdateOperationsInput | string
    tasks_user?: StringFieldUpdateOperationsInput | string
    tasks_info?: StringFieldUpdateOperationsInput | string
    tasks_flag?: IntFieldUpdateOperationsInput | number
  }

  export type tasksUncheckedUpdateManyInput = {
    tasks_uuid?: StringFieldUpdateOperationsInput | string
    tasks_type?: StringFieldUpdateOperationsInput | string
    tasks_user?: StringFieldUpdateOperationsInput | string
    tasks_info?: StringFieldUpdateOperationsInput | string
    tasks_flag?: IntFieldUpdateOperationsInput | number
  }

  export type fetchCreateInput = {
    fetch_uuid: string
    fetch_from: string
    fetch_dest: string
    fetch_user: string
    fetch_flag: number
  }

  export type fetchUncheckedCreateInput = {
    fetch_uuid: string
    fetch_from: string
    fetch_dest: string
    fetch_user: string
    fetch_flag: number
  }

  export type fetchUpdateInput = {
    fetch_uuid?: StringFieldUpdateOperationsInput | string
    fetch_from?: StringFieldUpdateOperationsInput | string
    fetch_dest?: StringFieldUpdateOperationsInput | string
    fetch_user?: StringFieldUpdateOperationsInput | string
    fetch_flag?: IntFieldUpdateOperationsInput | number
  }

  export type fetchUncheckedUpdateInput = {
    fetch_uuid?: StringFieldUpdateOperationsInput | string
    fetch_from?: StringFieldUpdateOperationsInput | string
    fetch_dest?: StringFieldUpdateOperationsInput | string
    fetch_user?: StringFieldUpdateOperationsInput | string
    fetch_flag?: IntFieldUpdateOperationsInput | number
  }

  export type fetchCreateManyInput = {
    fetch_uuid: string
    fetch_from: string
    fetch_dest: string
    fetch_user: string
    fetch_flag: number
  }

  export type fetchUpdateManyMutationInput = {
    fetch_uuid?: StringFieldUpdateOperationsInput | string
    fetch_from?: StringFieldUpdateOperationsInput | string
    fetch_dest?: StringFieldUpdateOperationsInput | string
    fetch_user?: StringFieldUpdateOperationsInput | string
    fetch_flag?: IntFieldUpdateOperationsInput | number
  }

  export type fetchUncheckedUpdateManyInput = {
    fetch_uuid?: StringFieldUpdateOperationsInput | string
    fetch_from?: StringFieldUpdateOperationsInput | string
    fetch_dest?: StringFieldUpdateOperationsInput | string
    fetch_user?: StringFieldUpdateOperationsInput | string
    fetch_flag?: IntFieldUpdateOperationsInput | number
  }

  export type groupCreateInput = {
    group_name: string
    group_mask: string
    is_enabled: number
  }

  export type groupUncheckedCreateInput = {
    group_name: string
    group_mask: string
    is_enabled: number
  }

  export type groupUpdateInput = {
    group_name?: StringFieldUpdateOperationsInput | string
    group_mask?: StringFieldUpdateOperationsInput | string
    is_enabled?: IntFieldUpdateOperationsInput | number
  }

  export type groupUncheckedUpdateInput = {
    group_name?: StringFieldUpdateOperationsInput | string
    group_mask?: StringFieldUpdateOperationsInput | string
    is_enabled?: IntFieldUpdateOperationsInput | number
  }

  export type groupCreateManyInput = {
    group_name: string
    group_mask: string
    is_enabled: number
  }

  export type groupUpdateManyMutationInput = {
    group_name?: StringFieldUpdateOperationsInput | string
    group_mask?: StringFieldUpdateOperationsInput | string
    is_enabled?: IntFieldUpdateOperationsInput | number
  }

  export type groupUncheckedUpdateManyInput = {
    group_name?: StringFieldUpdateOperationsInput | string
    group_mask?: StringFieldUpdateOperationsInput | string
    is_enabled?: IntFieldUpdateOperationsInput | number
  }

  export type cacheCreateInput = {
    cache_path: string
    cache_info?: number | null
    cache_time?: number | null
  }

  export type cacheUncheckedCreateInput = {
    cache_path: string
    cache_info?: number | null
    cache_time?: number | null
  }

  export type cacheUpdateInput = {
    cache_path?: StringFieldUpdateOperationsInput | string
    cache_info?: NullableIntFieldUpdateOperationsInput | number | null
    cache_time?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type cacheUncheckedUpdateInput = {
    cache_path?: StringFieldUpdateOperationsInput | string
    cache_info?: NullableIntFieldUpdateOperationsInput | number | null
    cache_time?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type cacheCreateManyInput = {
    cache_path: string
    cache_info?: number | null
    cache_time?: number | null
  }

  export type cacheUpdateManyMutationInput = {
    cache_path?: StringFieldUpdateOperationsInput | string
    cache_info?: NullableIntFieldUpdateOperationsInput | number | null
    cache_time?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type cacheUncheckedUpdateManyInput = {
    cache_path?: StringFieldUpdateOperationsInput | string
    cache_info?: NullableIntFieldUpdateOperationsInput | number | null
    cache_time?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type adminCreateInput = {
    admin_keys: string
    admin_data: string
  }

  export type adminUncheckedCreateInput = {
    admin_keys: string
    admin_data: string
  }

  export type adminUpdateInput = {
    admin_keys?: StringFieldUpdateOperationsInput | string
    admin_data?: StringFieldUpdateOperationsInput | string
  }

  export type adminUncheckedUpdateInput = {
    admin_keys?: StringFieldUpdateOperationsInput | string
    admin_data?: StringFieldUpdateOperationsInput | string
  }

  export type adminCreateManyInput = {
    admin_keys: string
    admin_data: string
  }

  export type adminUpdateManyMutationInput = {
    admin_keys?: StringFieldUpdateOperationsInput | string
    admin_data?: StringFieldUpdateOperationsInput | string
  }

  export type adminUncheckedUpdateManyInput = {
    admin_keys?: StringFieldUpdateOperationsInput | string
    admin_data?: StringFieldUpdateOperationsInput | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type mountCountOrderByAggregateInput = {
    mount_path?: SortOrder
    mount_type?: SortOrder
    is_enabled?: SortOrder
    drive_conf?: SortOrder
    drive_save?: SortOrder
    cache_time?: SortOrder
    index_list?: SortOrder
    proxy_mode?: SortOrder
    proxy_data?: SortOrder
    drive_logs?: SortOrder
    drive_tips?: SortOrder
  }

  export type mountAvgOrderByAggregateInput = {
    is_enabled?: SortOrder
    cache_time?: SortOrder
    index_list?: SortOrder
    proxy_mode?: SortOrder
  }

  export type mountMaxOrderByAggregateInput = {
    mount_path?: SortOrder
    mount_type?: SortOrder
    is_enabled?: SortOrder
    drive_conf?: SortOrder
    drive_save?: SortOrder
    cache_time?: SortOrder
    index_list?: SortOrder
    proxy_mode?: SortOrder
    proxy_data?: SortOrder
    drive_logs?: SortOrder
    drive_tips?: SortOrder
  }

  export type mountMinOrderByAggregateInput = {
    mount_path?: SortOrder
    mount_type?: SortOrder
    is_enabled?: SortOrder
    drive_conf?: SortOrder
    drive_save?: SortOrder
    cache_time?: SortOrder
    index_list?: SortOrder
    proxy_mode?: SortOrder
    proxy_data?: SortOrder
    drive_logs?: SortOrder
    drive_tips?: SortOrder
  }

  export type mountSumOrderByAggregateInput = {
    is_enabled?: SortOrder
    cache_time?: SortOrder
    index_list?: SortOrder
    proxy_mode?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type usersCountOrderByAggregateInput = {
    users_name?: SortOrder
    users_mail?: SortOrder
    users_pass?: SortOrder
    users_mask?: SortOrder
    is_enabled?: SortOrder
    total_size?: SortOrder
    total_used?: SortOrder
    oauth_data?: SortOrder
    mount_data?: SortOrder
  }

  export type usersAvgOrderByAggregateInput = {
    is_enabled?: SortOrder
    total_size?: SortOrder
    total_used?: SortOrder
  }

  export type usersMaxOrderByAggregateInput = {
    users_name?: SortOrder
    users_mail?: SortOrder
    users_pass?: SortOrder
    users_mask?: SortOrder
    is_enabled?: SortOrder
    total_size?: SortOrder
    total_used?: SortOrder
    oauth_data?: SortOrder
    mount_data?: SortOrder
  }

  export type usersMinOrderByAggregateInput = {
    users_name?: SortOrder
    users_mail?: SortOrder
    users_pass?: SortOrder
    users_mask?: SortOrder
    is_enabled?: SortOrder
    total_size?: SortOrder
    total_used?: SortOrder
    oauth_data?: SortOrder
    mount_data?: SortOrder
  }

  export type usersSumOrderByAggregateInput = {
    is_enabled?: SortOrder
    total_size?: SortOrder
    total_used?: SortOrder
  }

  export type oauthCountOrderByAggregateInput = {
    oauth_name?: SortOrder
    oauth_type?: SortOrder
    oauth_data?: SortOrder
    is_enabled?: SortOrder
  }

  export type oauthAvgOrderByAggregateInput = {
    is_enabled?: SortOrder
  }

  export type oauthMaxOrderByAggregateInput = {
    oauth_name?: SortOrder
    oauth_type?: SortOrder
    oauth_data?: SortOrder
    is_enabled?: SortOrder
  }

  export type oauthMinOrderByAggregateInput = {
    oauth_name?: SortOrder
    oauth_type?: SortOrder
    oauth_data?: SortOrder
    is_enabled?: SortOrder
  }

  export type oauthSumOrderByAggregateInput = {
    is_enabled?: SortOrder
  }

  export type bindsCountOrderByAggregateInput = {
    oauth_uuid?: SortOrder
    oauth_name?: SortOrder
    binds_user?: SortOrder
    binds_data?: SortOrder
    is_enabled?: SortOrder
  }

  export type bindsAvgOrderByAggregateInput = {
    is_enabled?: SortOrder
  }

  export type bindsMaxOrderByAggregateInput = {
    oauth_uuid?: SortOrder
    oauth_name?: SortOrder
    binds_user?: SortOrder
    binds_data?: SortOrder
    is_enabled?: SortOrder
  }

  export type bindsMinOrderByAggregateInput = {
    oauth_uuid?: SortOrder
    oauth_name?: SortOrder
    binds_user?: SortOrder
    binds_data?: SortOrder
    is_enabled?: SortOrder
  }

  export type bindsSumOrderByAggregateInput = {
    is_enabled?: SortOrder
  }

  export type cryptCountOrderByAggregateInput = {
    crypt_name?: SortOrder
    crypt_pass?: SortOrder
    crypt_type?: SortOrder
    crypt_mode?: SortOrder
    is_enabled?: SortOrder
    crypt_self?: SortOrder
    rands_pass?: SortOrder
    oauth_data?: SortOrder
    write_name?: SortOrder
  }

  export type cryptAvgOrderByAggregateInput = {
    crypt_type?: SortOrder
    crypt_mode?: SortOrder
    is_enabled?: SortOrder
    crypt_self?: SortOrder
    rands_pass?: SortOrder
  }

  export type cryptMaxOrderByAggregateInput = {
    crypt_name?: SortOrder
    crypt_pass?: SortOrder
    crypt_type?: SortOrder
    crypt_mode?: SortOrder
    is_enabled?: SortOrder
    crypt_self?: SortOrder
    rands_pass?: SortOrder
    oauth_data?: SortOrder
    write_name?: SortOrder
  }

  export type cryptMinOrderByAggregateInput = {
    crypt_name?: SortOrder
    crypt_pass?: SortOrder
    crypt_type?: SortOrder
    crypt_mode?: SortOrder
    is_enabled?: SortOrder
    crypt_self?: SortOrder
    rands_pass?: SortOrder
    oauth_data?: SortOrder
    write_name?: SortOrder
  }

  export type cryptSumOrderByAggregateInput = {
    crypt_type?: SortOrder
    crypt_mode?: SortOrder
    is_enabled?: SortOrder
    crypt_self?: SortOrder
    rands_pass?: SortOrder
  }

  export type matesCountOrderByAggregateInput = {
    mates_name?: SortOrder
    mates_mask?: SortOrder
    mates_user?: SortOrder
    is_enabled?: SortOrder
    dir_hidden?: SortOrder
    dir_shared?: SortOrder
    set_zipped?: SortOrder
    set_parted?: SortOrder
    crypt_name?: SortOrder
    cache_time?: SortOrder
  }

  export type matesAvgOrderByAggregateInput = {
    mates_mask?: SortOrder
    mates_user?: SortOrder
    is_enabled?: SortOrder
    dir_hidden?: SortOrder
    dir_shared?: SortOrder
    cache_time?: SortOrder
  }

  export type matesMaxOrderByAggregateInput = {
    mates_name?: SortOrder
    mates_mask?: SortOrder
    mates_user?: SortOrder
    is_enabled?: SortOrder
    dir_hidden?: SortOrder
    dir_shared?: SortOrder
    set_zipped?: SortOrder
    set_parted?: SortOrder
    crypt_name?: SortOrder
    cache_time?: SortOrder
  }

  export type matesMinOrderByAggregateInput = {
    mates_name?: SortOrder
    mates_mask?: SortOrder
    mates_user?: SortOrder
    is_enabled?: SortOrder
    dir_hidden?: SortOrder
    dir_shared?: SortOrder
    set_zipped?: SortOrder
    set_parted?: SortOrder
    crypt_name?: SortOrder
    cache_time?: SortOrder
  }

  export type matesSumOrderByAggregateInput = {
    mates_mask?: SortOrder
    mates_user?: SortOrder
    is_enabled?: SortOrder
    dir_hidden?: SortOrder
    dir_shared?: SortOrder
    cache_time?: SortOrder
  }

  export type shareCountOrderByAggregateInput = {
    share_uuid?: SortOrder
    share_path?: SortOrder
    share_pass?: SortOrder
    share_user?: SortOrder
    share_date?: SortOrder
    share_ends?: SortOrder
    is_enabled?: SortOrder
  }

  export type shareAvgOrderByAggregateInput = {
    share_date?: SortOrder
    share_ends?: SortOrder
    is_enabled?: SortOrder
  }

  export type shareMaxOrderByAggregateInput = {
    share_uuid?: SortOrder
    share_path?: SortOrder
    share_pass?: SortOrder
    share_user?: SortOrder
    share_date?: SortOrder
    share_ends?: SortOrder
    is_enabled?: SortOrder
  }

  export type shareMinOrderByAggregateInput = {
    share_uuid?: SortOrder
    share_path?: SortOrder
    share_pass?: SortOrder
    share_user?: SortOrder
    share_date?: SortOrder
    share_ends?: SortOrder
    is_enabled?: SortOrder
  }

  export type shareSumOrderByAggregateInput = {
    share_date?: SortOrder
    share_ends?: SortOrder
    is_enabled?: SortOrder
  }

  export type tokenCountOrderByAggregateInput = {
    token_uuid?: SortOrder
    token_path?: SortOrder
    token_user?: SortOrder
    token_type?: SortOrder
    token_info?: SortOrder
    is_enabled?: SortOrder
  }

  export type tokenAvgOrderByAggregateInput = {
    is_enabled?: SortOrder
  }

  export type tokenMaxOrderByAggregateInput = {
    token_uuid?: SortOrder
    token_path?: SortOrder
    token_user?: SortOrder
    token_type?: SortOrder
    token_info?: SortOrder
    is_enabled?: SortOrder
  }

  export type tokenMinOrderByAggregateInput = {
    token_uuid?: SortOrder
    token_path?: SortOrder
    token_user?: SortOrder
    token_type?: SortOrder
    token_info?: SortOrder
    is_enabled?: SortOrder
  }

  export type tokenSumOrderByAggregateInput = {
    is_enabled?: SortOrder
  }

  export type tasksCountOrderByAggregateInput = {
    tasks_uuid?: SortOrder
    tasks_type?: SortOrder
    tasks_user?: SortOrder
    tasks_info?: SortOrder
    tasks_flag?: SortOrder
  }

  export type tasksAvgOrderByAggregateInput = {
    tasks_flag?: SortOrder
  }

  export type tasksMaxOrderByAggregateInput = {
    tasks_uuid?: SortOrder
    tasks_type?: SortOrder
    tasks_user?: SortOrder
    tasks_info?: SortOrder
    tasks_flag?: SortOrder
  }

  export type tasksMinOrderByAggregateInput = {
    tasks_uuid?: SortOrder
    tasks_type?: SortOrder
    tasks_user?: SortOrder
    tasks_info?: SortOrder
    tasks_flag?: SortOrder
  }

  export type tasksSumOrderByAggregateInput = {
    tasks_flag?: SortOrder
  }

  export type fetchCountOrderByAggregateInput = {
    fetch_uuid?: SortOrder
    fetch_from?: SortOrder
    fetch_dest?: SortOrder
    fetch_user?: SortOrder
    fetch_flag?: SortOrder
  }

  export type fetchAvgOrderByAggregateInput = {
    fetch_flag?: SortOrder
  }

  export type fetchMaxOrderByAggregateInput = {
    fetch_uuid?: SortOrder
    fetch_from?: SortOrder
    fetch_dest?: SortOrder
    fetch_user?: SortOrder
    fetch_flag?: SortOrder
  }

  export type fetchMinOrderByAggregateInput = {
    fetch_uuid?: SortOrder
    fetch_from?: SortOrder
    fetch_dest?: SortOrder
    fetch_user?: SortOrder
    fetch_flag?: SortOrder
  }

  export type fetchSumOrderByAggregateInput = {
    fetch_flag?: SortOrder
  }

  export type groupCountOrderByAggregateInput = {
    group_name?: SortOrder
    group_mask?: SortOrder
    is_enabled?: SortOrder
  }

  export type groupAvgOrderByAggregateInput = {
    is_enabled?: SortOrder
  }

  export type groupMaxOrderByAggregateInput = {
    group_name?: SortOrder
    group_mask?: SortOrder
    is_enabled?: SortOrder
  }

  export type groupMinOrderByAggregateInput = {
    group_name?: SortOrder
    group_mask?: SortOrder
    is_enabled?: SortOrder
  }

  export type groupSumOrderByAggregateInput = {
    is_enabled?: SortOrder
  }

  export type cacheCountOrderByAggregateInput = {
    cache_path?: SortOrder
    cache_info?: SortOrder
    cache_time?: SortOrder
  }

  export type cacheAvgOrderByAggregateInput = {
    cache_info?: SortOrder
    cache_time?: SortOrder
  }

  export type cacheMaxOrderByAggregateInput = {
    cache_path?: SortOrder
    cache_info?: SortOrder
    cache_time?: SortOrder
  }

  export type cacheMinOrderByAggregateInput = {
    cache_path?: SortOrder
    cache_info?: SortOrder
    cache_time?: SortOrder
  }

  export type cacheSumOrderByAggregateInput = {
    cache_info?: SortOrder
    cache_time?: SortOrder
  }

  export type adminCountOrderByAggregateInput = {
    admin_keys?: SortOrder
    admin_data?: SortOrder
  }

  export type adminMaxOrderByAggregateInput = {
    admin_keys?: SortOrder
    admin_data?: SortOrder
  }

  export type adminMinOrderByAggregateInput = {
    admin_keys?: SortOrder
    admin_data?: SortOrder
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}