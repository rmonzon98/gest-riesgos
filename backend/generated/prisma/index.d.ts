
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
 * Model SeguridadPersona
 * 
 */
export type SeguridadPersona = $Result.DefaultSelection<Prisma.$SeguridadPersonaPayload>
/**
 * Model SeguridadSesion
 * 
 */
export type SeguridadSesion = $Result.DefaultSelection<Prisma.$SeguridadSesionPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient({
 *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
 * })
 * // Fetch zero or more SeguridadPersonas
 * const seguridadPersonas = await prisma.seguridadPersona.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://pris.ly/d/client).
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
   * const prisma = new PrismaClient({
   *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
   * })
   * // Fetch zero or more SeguridadPersonas
   * const seguridadPersonas = await prisma.seguridadPersona.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://pris.ly/d/client).
   */

  constructor(optionsArg ?: Prisma.PrismaClientConstructorArgs<ClientOptions>);
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
   * Read more in our [docs](https://pris.ly/d/raw-queries).
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
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
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
   * Read more in our [docs](https://pris.ly/d/raw-queries).
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
   * Read more in our [docs](https://www.prisma.io/docs/orm/prisma-client/queries/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>

  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.seguridadPersona`: Exposes CRUD operations for the **SeguridadPersona** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more SeguridadPersonas
    * const seguridadPersonas = await prisma.seguridadPersona.findMany()
    * ```
    */
  get seguridadPersona(): Prisma.SeguridadPersonaDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.seguridadSesion`: Exposes CRUD operations for the **SeguridadSesion** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more SeguridadSesions
    * const seguridadSesions = await prisma.seguridadSesion.findMany()
    * ```
    */
  get seguridadSesion(): Prisma.SeguridadSesionDelegate<ExtArgs, ClientOptions>;
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
   * Prisma Client JS version: 7.9.1
   * Query Engine version: e922089b7d7502aff4249d5da3420f6fa55fc6ad
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
   * Resolved type of the argument passed to the `PrismaClient` constructor.
   *
   * When called without a narrower options type (the common case), this resolves
   * to `PrismaClientOptions` directly, which produces a clear TypeScript error
   * message (`not assignable to parameter of type 'PrismaClientOptions'`) when
   * the argument is missing or incomplete. When the user supplies a narrower
   * options type (e.g. via a literal), it falls back to `Subset` to keep
   * filtering out unknown properties.
   */
  export type PrismaClientConstructorArgs<Options extends PrismaClientOptions> =
    [PrismaClientOptions] extends [Options] ? PrismaClientOptions : Subset<Options, PrismaClientOptions>;

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
      ((Without<T, U> & U) | (Without<U, T> & T)) & object
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
    SeguridadPersona: 'SeguridadPersona',
    SeguridadSesion: 'SeguridadSesion'
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
      modelProps: "seguridadPersona" | "seguridadSesion"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      SeguridadPersona: {
        payload: Prisma.$SeguridadPersonaPayload<ExtArgs>
        fields: Prisma.SeguridadPersonaFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SeguridadPersonaFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeguridadPersonaPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SeguridadPersonaFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeguridadPersonaPayload>
          }
          findFirst: {
            args: Prisma.SeguridadPersonaFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeguridadPersonaPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SeguridadPersonaFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeguridadPersonaPayload>
          }
          findMany: {
            args: Prisma.SeguridadPersonaFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeguridadPersonaPayload>[]
          }
          create: {
            args: Prisma.SeguridadPersonaCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeguridadPersonaPayload>
          }
          createMany: {
            args: Prisma.SeguridadPersonaCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.SeguridadPersonaDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeguridadPersonaPayload>
          }
          update: {
            args: Prisma.SeguridadPersonaUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeguridadPersonaPayload>
          }
          deleteMany: {
            args: Prisma.SeguridadPersonaDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SeguridadPersonaUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.SeguridadPersonaUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeguridadPersonaPayload>
          }
          aggregate: {
            args: Prisma.SeguridadPersonaAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSeguridadPersona>
          }
          groupBy: {
            args: Prisma.SeguridadPersonaGroupByArgs<ExtArgs>
            result: $Utils.Optional<SeguridadPersonaGroupByOutputType>[]
          }
          count: {
            args: Prisma.SeguridadPersonaCountArgs<ExtArgs>
            result: $Utils.Optional<SeguridadPersonaCountAggregateOutputType> | number
          }
        }
      }
      SeguridadSesion: {
        payload: Prisma.$SeguridadSesionPayload<ExtArgs>
        fields: Prisma.SeguridadSesionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SeguridadSesionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeguridadSesionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SeguridadSesionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeguridadSesionPayload>
          }
          findFirst: {
            args: Prisma.SeguridadSesionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeguridadSesionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SeguridadSesionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeguridadSesionPayload>
          }
          findMany: {
            args: Prisma.SeguridadSesionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeguridadSesionPayload>[]
          }
          create: {
            args: Prisma.SeguridadSesionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeguridadSesionPayload>
          }
          createMany: {
            args: Prisma.SeguridadSesionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.SeguridadSesionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeguridadSesionPayload>
          }
          update: {
            args: Prisma.SeguridadSesionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeguridadSesionPayload>
          }
          deleteMany: {
            args: Prisma.SeguridadSesionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SeguridadSesionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.SeguridadSesionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeguridadSesionPayload>
          }
          aggregate: {
            args: Prisma.SeguridadSesionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSeguridadSesion>
          }
          groupBy: {
            args: Prisma.SeguridadSesionGroupByArgs<ExtArgs>
            result: $Utils.Optional<SeguridadSesionGroupByOutputType>[]
          }
          count: {
            args: Prisma.SeguridadSesionCountArgs<ExtArgs>
            result: $Utils.Optional<SeguridadSesionCountAggregateOutputType> | number
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
     * Read more in our [docs](https://pris.ly/d/logging).
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
     * A driver adapter that PrismaClient uses to connect to your database, such as the ones provided by `@prisma/adapter-pg`, `@prisma/adapter-libsql`, `@prisma/adapter-planetscale`, etc.
     * 
     * A driver adapter is **required** unless you connect to your database through Prisma Accelerate (in which case use `accelerateUrl` instead).
     * 
     * Learn more: https://pris.ly/d/driver-adapters
     * 
     * @example
     * ```ts
     * import { PrismaPg } from '@prisma/adapter-pg'
     * import { PrismaClient } from './generated/prisma/client'
     * 
     * const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
     * const prisma = new PrismaClient({ adapter })
     * ```
     */
    adapter?: runtime.SqlDriverAdapterFactory
    /**
     * The Prisma Accelerate connection URL. Use this option to connect to your database through Prisma Accelerate instead of using a driver adapter to connect directly.
     * 
     * Learn more: https://pris.ly/d/accelerate
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
    /**
     * SQL commenter plugins that add metadata to SQL queries as comments.
     * Comments follow the sqlcommenter format: https://google.github.io/sqlcommenter/
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   adapter,
     *   comments: [
     *     traceContext(),
     *     queryInsights(),
     *   ],
     * })
     * ```
     */
    comments?: runtime.SqlCommenterPlugin[]
  }
  export type GlobalOmitConfig = {
    seguridadPersona?: SeguridadPersonaOmit
    seguridadSesion?: SeguridadSesionOmit
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
   * Model SeguridadPersona
   */

  export type AggregateSeguridadPersona = {
    _count: SeguridadPersonaCountAggregateOutputType | null
    _avg: SeguridadPersonaAvgAggregateOutputType | null
    _sum: SeguridadPersonaSumAggregateOutputType | null
    _min: SeguridadPersonaMinAggregateOutputType | null
    _max: SeguridadPersonaMaxAggregateOutputType | null
  }

  export type SeguridadPersonaAvgAggregateOutputType = {
    codigoColaborador: number | null
    codigoEntidad: number | null
    codigoCia: number | null
    activo: number | null
  }

  export type SeguridadPersonaSumAggregateOutputType = {
    codigoColaborador: number | null
    codigoEntidad: number | null
    codigoCia: number | null
    activo: number | null
  }

  export type SeguridadPersonaMinAggregateOutputType = {
    codigoColaborador: number | null
    codigoEntidad: number | null
    codigoCia: number | null
    activo: number | null
  }

  export type SeguridadPersonaMaxAggregateOutputType = {
    codigoColaborador: number | null
    codigoEntidad: number | null
    codigoCia: number | null
    activo: number | null
  }

  export type SeguridadPersonaCountAggregateOutputType = {
    codigoColaborador: number
    codigoEntidad: number
    codigoCia: number
    activo: number
    _all: number
  }


  export type SeguridadPersonaAvgAggregateInputType = {
    codigoColaborador?: true
    codigoEntidad?: true
    codigoCia?: true
    activo?: true
  }

  export type SeguridadPersonaSumAggregateInputType = {
    codigoColaborador?: true
    codigoEntidad?: true
    codigoCia?: true
    activo?: true
  }

  export type SeguridadPersonaMinAggregateInputType = {
    codigoColaborador?: true
    codigoEntidad?: true
    codigoCia?: true
    activo?: true
  }

  export type SeguridadPersonaMaxAggregateInputType = {
    codigoColaborador?: true
    codigoEntidad?: true
    codigoCia?: true
    activo?: true
  }

  export type SeguridadPersonaCountAggregateInputType = {
    codigoColaborador?: true
    codigoEntidad?: true
    codigoCia?: true
    activo?: true
    _all?: true
  }

  export type SeguridadPersonaAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SeguridadPersona to aggregate.
     */
    where?: SeguridadPersonaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SeguridadPersonas to fetch.
     */
    orderBy?: SeguridadPersonaOrderByWithRelationInput | SeguridadPersonaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SeguridadPersonaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SeguridadPersonas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SeguridadPersonas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned SeguridadPersonas
    **/
    _count?: true | SeguridadPersonaCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SeguridadPersonaAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SeguridadPersonaSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SeguridadPersonaMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SeguridadPersonaMaxAggregateInputType
  }

  export type GetSeguridadPersonaAggregateType<T extends SeguridadPersonaAggregateArgs> = {
        [P in keyof T & keyof AggregateSeguridadPersona]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSeguridadPersona[P]>
      : GetScalarType<T[P], AggregateSeguridadPersona[P]>
  }




  export type SeguridadPersonaGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SeguridadPersonaWhereInput
    orderBy?: SeguridadPersonaOrderByWithAggregationInput | SeguridadPersonaOrderByWithAggregationInput[]
    by: SeguridadPersonaScalarFieldEnum[] | SeguridadPersonaScalarFieldEnum
    having?: SeguridadPersonaScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SeguridadPersonaCountAggregateInputType | true
    _avg?: SeguridadPersonaAvgAggregateInputType
    _sum?: SeguridadPersonaSumAggregateInputType
    _min?: SeguridadPersonaMinAggregateInputType
    _max?: SeguridadPersonaMaxAggregateInputType
  }

  export type SeguridadPersonaGroupByOutputType = {
    codigoColaborador: number
    codigoEntidad: number
    codigoCia: number
    activo: number
    _count: SeguridadPersonaCountAggregateOutputType | null
    _avg: SeguridadPersonaAvgAggregateOutputType | null
    _sum: SeguridadPersonaSumAggregateOutputType | null
    _min: SeguridadPersonaMinAggregateOutputType | null
    _max: SeguridadPersonaMaxAggregateOutputType | null
  }

  type GetSeguridadPersonaGroupByPayload<T extends SeguridadPersonaGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SeguridadPersonaGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SeguridadPersonaGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SeguridadPersonaGroupByOutputType[P]>
            : GetScalarType<T[P], SeguridadPersonaGroupByOutputType[P]>
        }
      >
    >


  export type SeguridadPersonaSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    codigoColaborador?: boolean
    codigoEntidad?: boolean
    codigoCia?: boolean
    activo?: boolean
  }, ExtArgs["result"]["seguridadPersona"]>



  export type SeguridadPersonaSelectScalar = {
    codigoColaborador?: boolean
    codigoEntidad?: boolean
    codigoCia?: boolean
    activo?: boolean
  }

  export type SeguridadPersonaOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"codigoColaborador" | "codigoEntidad" | "codigoCia" | "activo", ExtArgs["result"]["seguridadPersona"]>

  export type $SeguridadPersonaPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "SeguridadPersona"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      codigoColaborador: number
      codigoEntidad: number
      codigoCia: number
      activo: number
    }, ExtArgs["result"]["seguridadPersona"]>
    composites: {}
  }

  type SeguridadPersonaGetPayload<S extends boolean | null | undefined | SeguridadPersonaDefaultArgs> = $Result.GetResult<Prisma.$SeguridadPersonaPayload, S>

  type SeguridadPersonaCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SeguridadPersonaFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SeguridadPersonaCountAggregateInputType | true
    }

  export interface SeguridadPersonaDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['SeguridadPersona'], meta: { name: 'SeguridadPersona' } }
    /**
     * Find zero or one SeguridadPersona that matches the filter.
     * @param {SeguridadPersonaFindUniqueArgs} args - Arguments to find a SeguridadPersona
     * @example
     * // Get one SeguridadPersona
     * const seguridadPersona = await prisma.seguridadPersona.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SeguridadPersonaFindUniqueArgs>(args: SelectSubset<T, SeguridadPersonaFindUniqueArgs<ExtArgs>>): Prisma__SeguridadPersonaClient<$Result.GetResult<Prisma.$SeguridadPersonaPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one SeguridadPersona that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SeguridadPersonaFindUniqueOrThrowArgs} args - Arguments to find a SeguridadPersona
     * @example
     * // Get one SeguridadPersona
     * const seguridadPersona = await prisma.seguridadPersona.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SeguridadPersonaFindUniqueOrThrowArgs>(args: SelectSubset<T, SeguridadPersonaFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SeguridadPersonaClient<$Result.GetResult<Prisma.$SeguridadPersonaPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SeguridadPersona that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SeguridadPersonaFindFirstArgs} args - Arguments to find a SeguridadPersona
     * @example
     * // Get one SeguridadPersona
     * const seguridadPersona = await prisma.seguridadPersona.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SeguridadPersonaFindFirstArgs>(args?: SelectSubset<T, SeguridadPersonaFindFirstArgs<ExtArgs>>): Prisma__SeguridadPersonaClient<$Result.GetResult<Prisma.$SeguridadPersonaPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SeguridadPersona that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SeguridadPersonaFindFirstOrThrowArgs} args - Arguments to find a SeguridadPersona
     * @example
     * // Get one SeguridadPersona
     * const seguridadPersona = await prisma.seguridadPersona.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SeguridadPersonaFindFirstOrThrowArgs>(args?: SelectSubset<T, SeguridadPersonaFindFirstOrThrowArgs<ExtArgs>>): Prisma__SeguridadPersonaClient<$Result.GetResult<Prisma.$SeguridadPersonaPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more SeguridadPersonas that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SeguridadPersonaFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all SeguridadPersonas
     * const seguridadPersonas = await prisma.seguridadPersona.findMany()
     * 
     * // Get first 10 SeguridadPersonas
     * const seguridadPersonas = await prisma.seguridadPersona.findMany({ take: 10 })
     * 
     * // Only select the `codigoColaborador`
     * const seguridadPersonaWithCodigoColaboradorOnly = await prisma.seguridadPersona.findMany({ select: { codigoColaborador: true } })
     * 
     */
    findMany<T extends SeguridadPersonaFindManyArgs>(args?: SelectSubset<T, SeguridadPersonaFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SeguridadPersonaPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a SeguridadPersona.
     * @param {SeguridadPersonaCreateArgs} args - Arguments to create a SeguridadPersona.
     * @example
     * // Create one SeguridadPersona
     * const SeguridadPersona = await prisma.seguridadPersona.create({
     *   data: {
     *     // ... data to create a SeguridadPersona
     *   }
     * })
     * 
     */
    create<T extends SeguridadPersonaCreateArgs>(args: SelectSubset<T, SeguridadPersonaCreateArgs<ExtArgs>>): Prisma__SeguridadPersonaClient<$Result.GetResult<Prisma.$SeguridadPersonaPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many SeguridadPersonas.
     * @param {SeguridadPersonaCreateManyArgs} args - Arguments to create many SeguridadPersonas.
     * @example
     * // Create many SeguridadPersonas
     * const seguridadPersona = await prisma.seguridadPersona.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SeguridadPersonaCreateManyArgs>(args?: SelectSubset<T, SeguridadPersonaCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a SeguridadPersona.
     * @param {SeguridadPersonaDeleteArgs} args - Arguments to delete one SeguridadPersona.
     * @example
     * // Delete one SeguridadPersona
     * const SeguridadPersona = await prisma.seguridadPersona.delete({
     *   where: {
     *     // ... filter to delete one SeguridadPersona
     *   }
     * })
     * 
     */
    delete<T extends SeguridadPersonaDeleteArgs>(args: SelectSubset<T, SeguridadPersonaDeleteArgs<ExtArgs>>): Prisma__SeguridadPersonaClient<$Result.GetResult<Prisma.$SeguridadPersonaPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one SeguridadPersona.
     * @param {SeguridadPersonaUpdateArgs} args - Arguments to update one SeguridadPersona.
     * @example
     * // Update one SeguridadPersona
     * const seguridadPersona = await prisma.seguridadPersona.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SeguridadPersonaUpdateArgs>(args: SelectSubset<T, SeguridadPersonaUpdateArgs<ExtArgs>>): Prisma__SeguridadPersonaClient<$Result.GetResult<Prisma.$SeguridadPersonaPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more SeguridadPersonas.
     * @param {SeguridadPersonaDeleteManyArgs} args - Arguments to filter SeguridadPersonas to delete.
     * @example
     * // Delete a few SeguridadPersonas
     * const { count } = await prisma.seguridadPersona.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SeguridadPersonaDeleteManyArgs>(args?: SelectSubset<T, SeguridadPersonaDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SeguridadPersonas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SeguridadPersonaUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many SeguridadPersonas
     * const seguridadPersona = await prisma.seguridadPersona.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SeguridadPersonaUpdateManyArgs>(args: SelectSubset<T, SeguridadPersonaUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one SeguridadPersona.
     * @param {SeguridadPersonaUpsertArgs} args - Arguments to update or create a SeguridadPersona.
     * @example
     * // Update or create a SeguridadPersona
     * const seguridadPersona = await prisma.seguridadPersona.upsert({
     *   create: {
     *     // ... data to create a SeguridadPersona
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the SeguridadPersona we want to update
     *   }
     * })
     */
    upsert<T extends SeguridadPersonaUpsertArgs>(args: SelectSubset<T, SeguridadPersonaUpsertArgs<ExtArgs>>): Prisma__SeguridadPersonaClient<$Result.GetResult<Prisma.$SeguridadPersonaPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of SeguridadPersonas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SeguridadPersonaCountArgs} args - Arguments to filter SeguridadPersonas to count.
     * @example
     * // Count the number of SeguridadPersonas
     * const count = await prisma.seguridadPersona.count({
     *   where: {
     *     // ... the filter for the SeguridadPersonas we want to count
     *   }
     * })
    **/
    count<T extends SeguridadPersonaCountArgs>(
      args?: Subset<T, SeguridadPersonaCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SeguridadPersonaCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a SeguridadPersona.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SeguridadPersonaAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends SeguridadPersonaAggregateArgs>(args: Subset<T, SeguridadPersonaAggregateArgs>): Prisma.PrismaPromise<GetSeguridadPersonaAggregateType<T>>

    /**
     * Group by SeguridadPersona.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SeguridadPersonaGroupByArgs} args - Group by arguments.
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
      T extends SeguridadPersonaGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SeguridadPersonaGroupByArgs['orderBy'] }
        : { orderBy?: SeguridadPersonaGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, SeguridadPersonaGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSeguridadPersonaGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the SeguridadPersona model
   */
  readonly fields: SeguridadPersonaFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for SeguridadPersona.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SeguridadPersonaClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
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
   * Fields of the SeguridadPersona model
   */
  interface SeguridadPersonaFieldRefs {
    readonly codigoColaborador: FieldRef<"SeguridadPersona", 'Int'>
    readonly codigoEntidad: FieldRef<"SeguridadPersona", 'Int'>
    readonly codigoCia: FieldRef<"SeguridadPersona", 'Int'>
    readonly activo: FieldRef<"SeguridadPersona", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * SeguridadPersona findUnique
   */
  export type SeguridadPersonaFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeguridadPersona
     */
    select?: SeguridadPersonaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SeguridadPersona
     */
    omit?: SeguridadPersonaOmit<ExtArgs> | null
    /**
     * Filter, which SeguridadPersona to fetch.
     */
    where: SeguridadPersonaWhereUniqueInput
  }

  /**
   * SeguridadPersona findUniqueOrThrow
   */
  export type SeguridadPersonaFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeguridadPersona
     */
    select?: SeguridadPersonaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SeguridadPersona
     */
    omit?: SeguridadPersonaOmit<ExtArgs> | null
    /**
     * Filter, which SeguridadPersona to fetch.
     */
    where: SeguridadPersonaWhereUniqueInput
  }

  /**
   * SeguridadPersona findFirst
   */
  export type SeguridadPersonaFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeguridadPersona
     */
    select?: SeguridadPersonaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SeguridadPersona
     */
    omit?: SeguridadPersonaOmit<ExtArgs> | null
    /**
     * Filter, which SeguridadPersona to fetch.
     */
    where?: SeguridadPersonaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SeguridadPersonas to fetch.
     */
    orderBy?: SeguridadPersonaOrderByWithRelationInput | SeguridadPersonaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SeguridadPersonas.
     */
    cursor?: SeguridadPersonaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SeguridadPersonas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SeguridadPersonas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SeguridadPersonas.
     */
    distinct?: SeguridadPersonaScalarFieldEnum | SeguridadPersonaScalarFieldEnum[]
  }

  /**
   * SeguridadPersona findFirstOrThrow
   */
  export type SeguridadPersonaFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeguridadPersona
     */
    select?: SeguridadPersonaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SeguridadPersona
     */
    omit?: SeguridadPersonaOmit<ExtArgs> | null
    /**
     * Filter, which SeguridadPersona to fetch.
     */
    where?: SeguridadPersonaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SeguridadPersonas to fetch.
     */
    orderBy?: SeguridadPersonaOrderByWithRelationInput | SeguridadPersonaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SeguridadPersonas.
     */
    cursor?: SeguridadPersonaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SeguridadPersonas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SeguridadPersonas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SeguridadPersonas.
     */
    distinct?: SeguridadPersonaScalarFieldEnum | SeguridadPersonaScalarFieldEnum[]
  }

  /**
   * SeguridadPersona findMany
   */
  export type SeguridadPersonaFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeguridadPersona
     */
    select?: SeguridadPersonaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SeguridadPersona
     */
    omit?: SeguridadPersonaOmit<ExtArgs> | null
    /**
     * Filter, which SeguridadPersonas to fetch.
     */
    where?: SeguridadPersonaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SeguridadPersonas to fetch.
     */
    orderBy?: SeguridadPersonaOrderByWithRelationInput | SeguridadPersonaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing SeguridadPersonas.
     */
    cursor?: SeguridadPersonaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SeguridadPersonas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SeguridadPersonas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SeguridadPersonas.
     */
    distinct?: SeguridadPersonaScalarFieldEnum | SeguridadPersonaScalarFieldEnum[]
  }

  /**
   * SeguridadPersona create
   */
  export type SeguridadPersonaCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeguridadPersona
     */
    select?: SeguridadPersonaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SeguridadPersona
     */
    omit?: SeguridadPersonaOmit<ExtArgs> | null
    /**
     * The data needed to create a SeguridadPersona.
     */
    data: XOR<SeguridadPersonaCreateInput, SeguridadPersonaUncheckedCreateInput>
  }

  /**
   * SeguridadPersona createMany
   */
  export type SeguridadPersonaCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many SeguridadPersonas.
     */
    data: SeguridadPersonaCreateManyInput | SeguridadPersonaCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * SeguridadPersona update
   */
  export type SeguridadPersonaUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeguridadPersona
     */
    select?: SeguridadPersonaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SeguridadPersona
     */
    omit?: SeguridadPersonaOmit<ExtArgs> | null
    /**
     * The data needed to update a SeguridadPersona.
     */
    data: XOR<SeguridadPersonaUpdateInput, SeguridadPersonaUncheckedUpdateInput>
    /**
     * Choose, which SeguridadPersona to update.
     */
    where: SeguridadPersonaWhereUniqueInput
  }

  /**
   * SeguridadPersona updateMany
   */
  export type SeguridadPersonaUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update SeguridadPersonas.
     */
    data: XOR<SeguridadPersonaUpdateManyMutationInput, SeguridadPersonaUncheckedUpdateManyInput>
    /**
     * Filter which SeguridadPersonas to update
     */
    where?: SeguridadPersonaWhereInput
    /**
     * Limit how many SeguridadPersonas to update.
     */
    limit?: number
  }

  /**
   * SeguridadPersona upsert
   */
  export type SeguridadPersonaUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeguridadPersona
     */
    select?: SeguridadPersonaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SeguridadPersona
     */
    omit?: SeguridadPersonaOmit<ExtArgs> | null
    /**
     * The filter to search for the SeguridadPersona to update in case it exists.
     */
    where: SeguridadPersonaWhereUniqueInput
    /**
     * In case the SeguridadPersona found by the `where` argument doesn't exist, create a new SeguridadPersona with this data.
     */
    create: XOR<SeguridadPersonaCreateInput, SeguridadPersonaUncheckedCreateInput>
    /**
     * In case the SeguridadPersona was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SeguridadPersonaUpdateInput, SeguridadPersonaUncheckedUpdateInput>
  }

  /**
   * SeguridadPersona delete
   */
  export type SeguridadPersonaDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeguridadPersona
     */
    select?: SeguridadPersonaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SeguridadPersona
     */
    omit?: SeguridadPersonaOmit<ExtArgs> | null
    /**
     * Filter which SeguridadPersona to delete.
     */
    where: SeguridadPersonaWhereUniqueInput
  }

  /**
   * SeguridadPersona deleteMany
   */
  export type SeguridadPersonaDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SeguridadPersonas to delete
     */
    where?: SeguridadPersonaWhereInput
    /**
     * Limit how many SeguridadPersonas to delete.
     */
    limit?: number
  }

  /**
   * SeguridadPersona without action
   */
  export type SeguridadPersonaDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeguridadPersona
     */
    select?: SeguridadPersonaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SeguridadPersona
     */
    omit?: SeguridadPersonaOmit<ExtArgs> | null
  }


  /**
   * Model SeguridadSesion
   */

  export type AggregateSeguridadSesion = {
    _count: SeguridadSesionCountAggregateOutputType | null
    _avg: SeguridadSesionAvgAggregateOutputType | null
    _sum: SeguridadSesionSumAggregateOutputType | null
    _min: SeguridadSesionMinAggregateOutputType | null
    _max: SeguridadSesionMaxAggregateOutputType | null
  }

  export type SeguridadSesionAvgAggregateOutputType = {
    codigoCia: number | null
    codigoColaborador: number | null
    activo: number | null
  }

  export type SeguridadSesionSumAggregateOutputType = {
    codigoCia: number | null
    codigoColaborador: number | null
    activo: number | null
  }

  export type SeguridadSesionMinAggregateOutputType = {
    idSesion: string | null
    codigoCia: number | null
    codigoColaborador: number | null
    activo: number | null
    fechaRevocacion: Date | null
    fechaExpiracion: Date | null
  }

  export type SeguridadSesionMaxAggregateOutputType = {
    idSesion: string | null
    codigoCia: number | null
    codigoColaborador: number | null
    activo: number | null
    fechaRevocacion: Date | null
    fechaExpiracion: Date | null
  }

  export type SeguridadSesionCountAggregateOutputType = {
    idSesion: number
    codigoCia: number
    codigoColaborador: number
    activo: number
    fechaRevocacion: number
    fechaExpiracion: number
    _all: number
  }


  export type SeguridadSesionAvgAggregateInputType = {
    codigoCia?: true
    codigoColaborador?: true
    activo?: true
  }

  export type SeguridadSesionSumAggregateInputType = {
    codigoCia?: true
    codigoColaborador?: true
    activo?: true
  }

  export type SeguridadSesionMinAggregateInputType = {
    idSesion?: true
    codigoCia?: true
    codigoColaborador?: true
    activo?: true
    fechaRevocacion?: true
    fechaExpiracion?: true
  }

  export type SeguridadSesionMaxAggregateInputType = {
    idSesion?: true
    codigoCia?: true
    codigoColaborador?: true
    activo?: true
    fechaRevocacion?: true
    fechaExpiracion?: true
  }

  export type SeguridadSesionCountAggregateInputType = {
    idSesion?: true
    codigoCia?: true
    codigoColaborador?: true
    activo?: true
    fechaRevocacion?: true
    fechaExpiracion?: true
    _all?: true
  }

  export type SeguridadSesionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SeguridadSesion to aggregate.
     */
    where?: SeguridadSesionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SeguridadSesions to fetch.
     */
    orderBy?: SeguridadSesionOrderByWithRelationInput | SeguridadSesionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SeguridadSesionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SeguridadSesions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SeguridadSesions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned SeguridadSesions
    **/
    _count?: true | SeguridadSesionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SeguridadSesionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SeguridadSesionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SeguridadSesionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SeguridadSesionMaxAggregateInputType
  }

  export type GetSeguridadSesionAggregateType<T extends SeguridadSesionAggregateArgs> = {
        [P in keyof T & keyof AggregateSeguridadSesion]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSeguridadSesion[P]>
      : GetScalarType<T[P], AggregateSeguridadSesion[P]>
  }




  export type SeguridadSesionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SeguridadSesionWhereInput
    orderBy?: SeguridadSesionOrderByWithAggregationInput | SeguridadSesionOrderByWithAggregationInput[]
    by: SeguridadSesionScalarFieldEnum[] | SeguridadSesionScalarFieldEnum
    having?: SeguridadSesionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SeguridadSesionCountAggregateInputType | true
    _avg?: SeguridadSesionAvgAggregateInputType
    _sum?: SeguridadSesionSumAggregateInputType
    _min?: SeguridadSesionMinAggregateInputType
    _max?: SeguridadSesionMaxAggregateInputType
  }

  export type SeguridadSesionGroupByOutputType = {
    idSesion: string
    codigoCia: number
    codigoColaborador: number
    activo: number
    fechaRevocacion: Date | null
    fechaExpiracion: Date
    _count: SeguridadSesionCountAggregateOutputType | null
    _avg: SeguridadSesionAvgAggregateOutputType | null
    _sum: SeguridadSesionSumAggregateOutputType | null
    _min: SeguridadSesionMinAggregateOutputType | null
    _max: SeguridadSesionMaxAggregateOutputType | null
  }

  type GetSeguridadSesionGroupByPayload<T extends SeguridadSesionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SeguridadSesionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SeguridadSesionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SeguridadSesionGroupByOutputType[P]>
            : GetScalarType<T[P], SeguridadSesionGroupByOutputType[P]>
        }
      >
    >


  export type SeguridadSesionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    idSesion?: boolean
    codigoCia?: boolean
    codigoColaborador?: boolean
    activo?: boolean
    fechaRevocacion?: boolean
    fechaExpiracion?: boolean
  }, ExtArgs["result"]["seguridadSesion"]>



  export type SeguridadSesionSelectScalar = {
    idSesion?: boolean
    codigoCia?: boolean
    codigoColaborador?: boolean
    activo?: boolean
    fechaRevocacion?: boolean
    fechaExpiracion?: boolean
  }

  export type SeguridadSesionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"idSesion" | "codigoCia" | "codigoColaborador" | "activo" | "fechaRevocacion" | "fechaExpiracion", ExtArgs["result"]["seguridadSesion"]>

  export type $SeguridadSesionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "SeguridadSesion"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      idSesion: string
      codigoCia: number
      codigoColaborador: number
      activo: number
      fechaRevocacion: Date | null
      fechaExpiracion: Date
    }, ExtArgs["result"]["seguridadSesion"]>
    composites: {}
  }

  type SeguridadSesionGetPayload<S extends boolean | null | undefined | SeguridadSesionDefaultArgs> = $Result.GetResult<Prisma.$SeguridadSesionPayload, S>

  type SeguridadSesionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SeguridadSesionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SeguridadSesionCountAggregateInputType | true
    }

  export interface SeguridadSesionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['SeguridadSesion'], meta: { name: 'SeguridadSesion' } }
    /**
     * Find zero or one SeguridadSesion that matches the filter.
     * @param {SeguridadSesionFindUniqueArgs} args - Arguments to find a SeguridadSesion
     * @example
     * // Get one SeguridadSesion
     * const seguridadSesion = await prisma.seguridadSesion.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SeguridadSesionFindUniqueArgs>(args: SelectSubset<T, SeguridadSesionFindUniqueArgs<ExtArgs>>): Prisma__SeguridadSesionClient<$Result.GetResult<Prisma.$SeguridadSesionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one SeguridadSesion that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SeguridadSesionFindUniqueOrThrowArgs} args - Arguments to find a SeguridadSesion
     * @example
     * // Get one SeguridadSesion
     * const seguridadSesion = await prisma.seguridadSesion.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SeguridadSesionFindUniqueOrThrowArgs>(args: SelectSubset<T, SeguridadSesionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SeguridadSesionClient<$Result.GetResult<Prisma.$SeguridadSesionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SeguridadSesion that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SeguridadSesionFindFirstArgs} args - Arguments to find a SeguridadSesion
     * @example
     * // Get one SeguridadSesion
     * const seguridadSesion = await prisma.seguridadSesion.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SeguridadSesionFindFirstArgs>(args?: SelectSubset<T, SeguridadSesionFindFirstArgs<ExtArgs>>): Prisma__SeguridadSesionClient<$Result.GetResult<Prisma.$SeguridadSesionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SeguridadSesion that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SeguridadSesionFindFirstOrThrowArgs} args - Arguments to find a SeguridadSesion
     * @example
     * // Get one SeguridadSesion
     * const seguridadSesion = await prisma.seguridadSesion.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SeguridadSesionFindFirstOrThrowArgs>(args?: SelectSubset<T, SeguridadSesionFindFirstOrThrowArgs<ExtArgs>>): Prisma__SeguridadSesionClient<$Result.GetResult<Prisma.$SeguridadSesionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more SeguridadSesions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SeguridadSesionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all SeguridadSesions
     * const seguridadSesions = await prisma.seguridadSesion.findMany()
     * 
     * // Get first 10 SeguridadSesions
     * const seguridadSesions = await prisma.seguridadSesion.findMany({ take: 10 })
     * 
     * // Only select the `idSesion`
     * const seguridadSesionWithIdSesionOnly = await prisma.seguridadSesion.findMany({ select: { idSesion: true } })
     * 
     */
    findMany<T extends SeguridadSesionFindManyArgs>(args?: SelectSubset<T, SeguridadSesionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SeguridadSesionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a SeguridadSesion.
     * @param {SeguridadSesionCreateArgs} args - Arguments to create a SeguridadSesion.
     * @example
     * // Create one SeguridadSesion
     * const SeguridadSesion = await prisma.seguridadSesion.create({
     *   data: {
     *     // ... data to create a SeguridadSesion
     *   }
     * })
     * 
     */
    create<T extends SeguridadSesionCreateArgs>(args: SelectSubset<T, SeguridadSesionCreateArgs<ExtArgs>>): Prisma__SeguridadSesionClient<$Result.GetResult<Prisma.$SeguridadSesionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many SeguridadSesions.
     * @param {SeguridadSesionCreateManyArgs} args - Arguments to create many SeguridadSesions.
     * @example
     * // Create many SeguridadSesions
     * const seguridadSesion = await prisma.seguridadSesion.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SeguridadSesionCreateManyArgs>(args?: SelectSubset<T, SeguridadSesionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a SeguridadSesion.
     * @param {SeguridadSesionDeleteArgs} args - Arguments to delete one SeguridadSesion.
     * @example
     * // Delete one SeguridadSesion
     * const SeguridadSesion = await prisma.seguridadSesion.delete({
     *   where: {
     *     // ... filter to delete one SeguridadSesion
     *   }
     * })
     * 
     */
    delete<T extends SeguridadSesionDeleteArgs>(args: SelectSubset<T, SeguridadSesionDeleteArgs<ExtArgs>>): Prisma__SeguridadSesionClient<$Result.GetResult<Prisma.$SeguridadSesionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one SeguridadSesion.
     * @param {SeguridadSesionUpdateArgs} args - Arguments to update one SeguridadSesion.
     * @example
     * // Update one SeguridadSesion
     * const seguridadSesion = await prisma.seguridadSesion.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SeguridadSesionUpdateArgs>(args: SelectSubset<T, SeguridadSesionUpdateArgs<ExtArgs>>): Prisma__SeguridadSesionClient<$Result.GetResult<Prisma.$SeguridadSesionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more SeguridadSesions.
     * @param {SeguridadSesionDeleteManyArgs} args - Arguments to filter SeguridadSesions to delete.
     * @example
     * // Delete a few SeguridadSesions
     * const { count } = await prisma.seguridadSesion.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SeguridadSesionDeleteManyArgs>(args?: SelectSubset<T, SeguridadSesionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SeguridadSesions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SeguridadSesionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many SeguridadSesions
     * const seguridadSesion = await prisma.seguridadSesion.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SeguridadSesionUpdateManyArgs>(args: SelectSubset<T, SeguridadSesionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one SeguridadSesion.
     * @param {SeguridadSesionUpsertArgs} args - Arguments to update or create a SeguridadSesion.
     * @example
     * // Update or create a SeguridadSesion
     * const seguridadSesion = await prisma.seguridadSesion.upsert({
     *   create: {
     *     // ... data to create a SeguridadSesion
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the SeguridadSesion we want to update
     *   }
     * })
     */
    upsert<T extends SeguridadSesionUpsertArgs>(args: SelectSubset<T, SeguridadSesionUpsertArgs<ExtArgs>>): Prisma__SeguridadSesionClient<$Result.GetResult<Prisma.$SeguridadSesionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of SeguridadSesions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SeguridadSesionCountArgs} args - Arguments to filter SeguridadSesions to count.
     * @example
     * // Count the number of SeguridadSesions
     * const count = await prisma.seguridadSesion.count({
     *   where: {
     *     // ... the filter for the SeguridadSesions we want to count
     *   }
     * })
    **/
    count<T extends SeguridadSesionCountArgs>(
      args?: Subset<T, SeguridadSesionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SeguridadSesionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a SeguridadSesion.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SeguridadSesionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends SeguridadSesionAggregateArgs>(args: Subset<T, SeguridadSesionAggregateArgs>): Prisma.PrismaPromise<GetSeguridadSesionAggregateType<T>>

    /**
     * Group by SeguridadSesion.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SeguridadSesionGroupByArgs} args - Group by arguments.
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
      T extends SeguridadSesionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SeguridadSesionGroupByArgs['orderBy'] }
        : { orderBy?: SeguridadSesionGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, SeguridadSesionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSeguridadSesionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the SeguridadSesion model
   */
  readonly fields: SeguridadSesionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for SeguridadSesion.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SeguridadSesionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
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
   * Fields of the SeguridadSesion model
   */
  interface SeguridadSesionFieldRefs {
    readonly idSesion: FieldRef<"SeguridadSesion", 'String'>
    readonly codigoCia: FieldRef<"SeguridadSesion", 'Int'>
    readonly codigoColaborador: FieldRef<"SeguridadSesion", 'Int'>
    readonly activo: FieldRef<"SeguridadSesion", 'Int'>
    readonly fechaRevocacion: FieldRef<"SeguridadSesion", 'DateTime'>
    readonly fechaExpiracion: FieldRef<"SeguridadSesion", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * SeguridadSesion findUnique
   */
  export type SeguridadSesionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeguridadSesion
     */
    select?: SeguridadSesionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SeguridadSesion
     */
    omit?: SeguridadSesionOmit<ExtArgs> | null
    /**
     * Filter, which SeguridadSesion to fetch.
     */
    where: SeguridadSesionWhereUniqueInput
  }

  /**
   * SeguridadSesion findUniqueOrThrow
   */
  export type SeguridadSesionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeguridadSesion
     */
    select?: SeguridadSesionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SeguridadSesion
     */
    omit?: SeguridadSesionOmit<ExtArgs> | null
    /**
     * Filter, which SeguridadSesion to fetch.
     */
    where: SeguridadSesionWhereUniqueInput
  }

  /**
   * SeguridadSesion findFirst
   */
  export type SeguridadSesionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeguridadSesion
     */
    select?: SeguridadSesionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SeguridadSesion
     */
    omit?: SeguridadSesionOmit<ExtArgs> | null
    /**
     * Filter, which SeguridadSesion to fetch.
     */
    where?: SeguridadSesionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SeguridadSesions to fetch.
     */
    orderBy?: SeguridadSesionOrderByWithRelationInput | SeguridadSesionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SeguridadSesions.
     */
    cursor?: SeguridadSesionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SeguridadSesions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SeguridadSesions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SeguridadSesions.
     */
    distinct?: SeguridadSesionScalarFieldEnum | SeguridadSesionScalarFieldEnum[]
  }

  /**
   * SeguridadSesion findFirstOrThrow
   */
  export type SeguridadSesionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeguridadSesion
     */
    select?: SeguridadSesionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SeguridadSesion
     */
    omit?: SeguridadSesionOmit<ExtArgs> | null
    /**
     * Filter, which SeguridadSesion to fetch.
     */
    where?: SeguridadSesionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SeguridadSesions to fetch.
     */
    orderBy?: SeguridadSesionOrderByWithRelationInput | SeguridadSesionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SeguridadSesions.
     */
    cursor?: SeguridadSesionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SeguridadSesions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SeguridadSesions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SeguridadSesions.
     */
    distinct?: SeguridadSesionScalarFieldEnum | SeguridadSesionScalarFieldEnum[]
  }

  /**
   * SeguridadSesion findMany
   */
  export type SeguridadSesionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeguridadSesion
     */
    select?: SeguridadSesionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SeguridadSesion
     */
    omit?: SeguridadSesionOmit<ExtArgs> | null
    /**
     * Filter, which SeguridadSesions to fetch.
     */
    where?: SeguridadSesionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SeguridadSesions to fetch.
     */
    orderBy?: SeguridadSesionOrderByWithRelationInput | SeguridadSesionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing SeguridadSesions.
     */
    cursor?: SeguridadSesionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SeguridadSesions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SeguridadSesions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SeguridadSesions.
     */
    distinct?: SeguridadSesionScalarFieldEnum | SeguridadSesionScalarFieldEnum[]
  }

  /**
   * SeguridadSesion create
   */
  export type SeguridadSesionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeguridadSesion
     */
    select?: SeguridadSesionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SeguridadSesion
     */
    omit?: SeguridadSesionOmit<ExtArgs> | null
    /**
     * The data needed to create a SeguridadSesion.
     */
    data: XOR<SeguridadSesionCreateInput, SeguridadSesionUncheckedCreateInput>
  }

  /**
   * SeguridadSesion createMany
   */
  export type SeguridadSesionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many SeguridadSesions.
     */
    data: SeguridadSesionCreateManyInput | SeguridadSesionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * SeguridadSesion update
   */
  export type SeguridadSesionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeguridadSesion
     */
    select?: SeguridadSesionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SeguridadSesion
     */
    omit?: SeguridadSesionOmit<ExtArgs> | null
    /**
     * The data needed to update a SeguridadSesion.
     */
    data: XOR<SeguridadSesionUpdateInput, SeguridadSesionUncheckedUpdateInput>
    /**
     * Choose, which SeguridadSesion to update.
     */
    where: SeguridadSesionWhereUniqueInput
  }

  /**
   * SeguridadSesion updateMany
   */
  export type SeguridadSesionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update SeguridadSesions.
     */
    data: XOR<SeguridadSesionUpdateManyMutationInput, SeguridadSesionUncheckedUpdateManyInput>
    /**
     * Filter which SeguridadSesions to update
     */
    where?: SeguridadSesionWhereInput
    /**
     * Limit how many SeguridadSesions to update.
     */
    limit?: number
  }

  /**
   * SeguridadSesion upsert
   */
  export type SeguridadSesionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeguridadSesion
     */
    select?: SeguridadSesionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SeguridadSesion
     */
    omit?: SeguridadSesionOmit<ExtArgs> | null
    /**
     * The filter to search for the SeguridadSesion to update in case it exists.
     */
    where: SeguridadSesionWhereUniqueInput
    /**
     * In case the SeguridadSesion found by the `where` argument doesn't exist, create a new SeguridadSesion with this data.
     */
    create: XOR<SeguridadSesionCreateInput, SeguridadSesionUncheckedCreateInput>
    /**
     * In case the SeguridadSesion was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SeguridadSesionUpdateInput, SeguridadSesionUncheckedUpdateInput>
  }

  /**
   * SeguridadSesion delete
   */
  export type SeguridadSesionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeguridadSesion
     */
    select?: SeguridadSesionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SeguridadSesion
     */
    omit?: SeguridadSesionOmit<ExtArgs> | null
    /**
     * Filter which SeguridadSesion to delete.
     */
    where: SeguridadSesionWhereUniqueInput
  }

  /**
   * SeguridadSesion deleteMany
   */
  export type SeguridadSesionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SeguridadSesions to delete
     */
    where?: SeguridadSesionWhereInput
    /**
     * Limit how many SeguridadSesions to delete.
     */
    limit?: number
  }

  /**
   * SeguridadSesion without action
   */
  export type SeguridadSesionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeguridadSesion
     */
    select?: SeguridadSesionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SeguridadSesion
     */
    omit?: SeguridadSesionOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const SeguridadPersonaScalarFieldEnum: {
    codigoColaborador: 'codigoColaborador',
    codigoEntidad: 'codigoEntidad',
    codigoCia: 'codigoCia',
    activo: 'activo'
  };

  export type SeguridadPersonaScalarFieldEnum = (typeof SeguridadPersonaScalarFieldEnum)[keyof typeof SeguridadPersonaScalarFieldEnum]


  export const SeguridadSesionScalarFieldEnum: {
    idSesion: 'idSesion',
    codigoCia: 'codigoCia',
    codigoColaborador: 'codigoColaborador',
    activo: 'activo',
    fechaRevocacion: 'fechaRevocacion',
    fechaExpiracion: 'fechaExpiracion'
  };

  export type SeguridadSesionScalarFieldEnum = (typeof SeguridadSesionScalarFieldEnum)[keyof typeof SeguridadSesionScalarFieldEnum]


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


  export const SeguridadSesionOrderByRelevanceFieldEnum: {
    idSesion: 'idSesion'
  };

  export type SeguridadSesionOrderByRelevanceFieldEnum = (typeof SeguridadSesionOrderByRelevanceFieldEnum)[keyof typeof SeguridadSesionOrderByRelevanceFieldEnum]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    
  /**
   * Deep Input Types
   */


  export type SeguridadPersonaWhereInput = {
    AND?: SeguridadPersonaWhereInput | SeguridadPersonaWhereInput[]
    OR?: SeguridadPersonaWhereInput[]
    NOT?: SeguridadPersonaWhereInput | SeguridadPersonaWhereInput[]
    codigoColaborador?: IntFilter<"SeguridadPersona"> | number
    codigoEntidad?: IntFilter<"SeguridadPersona"> | number
    codigoCia?: IntFilter<"SeguridadPersona"> | number
    activo?: IntFilter<"SeguridadPersona"> | number
  }

  export type SeguridadPersonaOrderByWithRelationInput = {
    codigoColaborador?: SortOrder
    codigoEntidad?: SortOrder
    codigoCia?: SortOrder
    activo?: SortOrder
  }

  export type SeguridadPersonaWhereUniqueInput = Prisma.AtLeast<{
    codigoCia_codigoColaborador?: SeguridadPersonaCodigoCiaCodigoColaboradorCompoundUniqueInput
    AND?: SeguridadPersonaWhereInput | SeguridadPersonaWhereInput[]
    OR?: SeguridadPersonaWhereInput[]
    NOT?: SeguridadPersonaWhereInput | SeguridadPersonaWhereInput[]
    codigoColaborador?: IntFilter<"SeguridadPersona"> | number
    codigoEntidad?: IntFilter<"SeguridadPersona"> | number
    codigoCia?: IntFilter<"SeguridadPersona"> | number
    activo?: IntFilter<"SeguridadPersona"> | number
  }, "codigoCia_codigoColaborador">

  export type SeguridadPersonaOrderByWithAggregationInput = {
    codigoColaborador?: SortOrder
    codigoEntidad?: SortOrder
    codigoCia?: SortOrder
    activo?: SortOrder
    _count?: SeguridadPersonaCountOrderByAggregateInput
    _avg?: SeguridadPersonaAvgOrderByAggregateInput
    _max?: SeguridadPersonaMaxOrderByAggregateInput
    _min?: SeguridadPersonaMinOrderByAggregateInput
    _sum?: SeguridadPersonaSumOrderByAggregateInput
  }

  export type SeguridadPersonaScalarWhereWithAggregatesInput = {
    AND?: SeguridadPersonaScalarWhereWithAggregatesInput | SeguridadPersonaScalarWhereWithAggregatesInput[]
    OR?: SeguridadPersonaScalarWhereWithAggregatesInput[]
    NOT?: SeguridadPersonaScalarWhereWithAggregatesInput | SeguridadPersonaScalarWhereWithAggregatesInput[]
    codigoColaborador?: IntWithAggregatesFilter<"SeguridadPersona"> | number
    codigoEntidad?: IntWithAggregatesFilter<"SeguridadPersona"> | number
    codigoCia?: IntWithAggregatesFilter<"SeguridadPersona"> | number
    activo?: IntWithAggregatesFilter<"SeguridadPersona"> | number
  }

  export type SeguridadSesionWhereInput = {
    AND?: SeguridadSesionWhereInput | SeguridadSesionWhereInput[]
    OR?: SeguridadSesionWhereInput[]
    NOT?: SeguridadSesionWhereInput | SeguridadSesionWhereInput[]
    idSesion?: StringFilter<"SeguridadSesion"> | string
    codigoCia?: IntFilter<"SeguridadSesion"> | number
    codigoColaborador?: IntFilter<"SeguridadSesion"> | number
    activo?: IntFilter<"SeguridadSesion"> | number
    fechaRevocacion?: DateTimeNullableFilter<"SeguridadSesion"> | Date | string | null
    fechaExpiracion?: DateTimeFilter<"SeguridadSesion"> | Date | string
  }

  export type SeguridadSesionOrderByWithRelationInput = {
    idSesion?: SortOrder
    codigoCia?: SortOrder
    codigoColaborador?: SortOrder
    activo?: SortOrder
    fechaRevocacion?: SortOrderInput | SortOrder
    fechaExpiracion?: SortOrder
    _relevance?: SeguridadSesionOrderByRelevanceInput
  }

  export type SeguridadSesionWhereUniqueInput = Prisma.AtLeast<{
    idSesion?: string
    AND?: SeguridadSesionWhereInput | SeguridadSesionWhereInput[]
    OR?: SeguridadSesionWhereInput[]
    NOT?: SeguridadSesionWhereInput | SeguridadSesionWhereInput[]
    codigoCia?: IntFilter<"SeguridadSesion"> | number
    codigoColaborador?: IntFilter<"SeguridadSesion"> | number
    activo?: IntFilter<"SeguridadSesion"> | number
    fechaRevocacion?: DateTimeNullableFilter<"SeguridadSesion"> | Date | string | null
    fechaExpiracion?: DateTimeFilter<"SeguridadSesion"> | Date | string
  }, "idSesion">

  export type SeguridadSesionOrderByWithAggregationInput = {
    idSesion?: SortOrder
    codigoCia?: SortOrder
    codigoColaborador?: SortOrder
    activo?: SortOrder
    fechaRevocacion?: SortOrderInput | SortOrder
    fechaExpiracion?: SortOrder
    _count?: SeguridadSesionCountOrderByAggregateInput
    _avg?: SeguridadSesionAvgOrderByAggregateInput
    _max?: SeguridadSesionMaxOrderByAggregateInput
    _min?: SeguridadSesionMinOrderByAggregateInput
    _sum?: SeguridadSesionSumOrderByAggregateInput
  }

  export type SeguridadSesionScalarWhereWithAggregatesInput = {
    AND?: SeguridadSesionScalarWhereWithAggregatesInput | SeguridadSesionScalarWhereWithAggregatesInput[]
    OR?: SeguridadSesionScalarWhereWithAggregatesInput[]
    NOT?: SeguridadSesionScalarWhereWithAggregatesInput | SeguridadSesionScalarWhereWithAggregatesInput[]
    idSesion?: StringWithAggregatesFilter<"SeguridadSesion"> | string
    codigoCia?: IntWithAggregatesFilter<"SeguridadSesion"> | number
    codigoColaborador?: IntWithAggregatesFilter<"SeguridadSesion"> | number
    activo?: IntWithAggregatesFilter<"SeguridadSesion"> | number
    fechaRevocacion?: DateTimeNullableWithAggregatesFilter<"SeguridadSesion"> | Date | string | null
    fechaExpiracion?: DateTimeWithAggregatesFilter<"SeguridadSesion"> | Date | string
  }

  export type SeguridadPersonaCreateInput = {
    codigoColaborador: number
    codigoEntidad: number
    codigoCia: number
    activo: number
  }

  export type SeguridadPersonaUncheckedCreateInput = {
    codigoColaborador: number
    codigoEntidad: number
    codigoCia: number
    activo: number
  }

  export type SeguridadPersonaUpdateInput = {
    codigoColaborador?: IntFieldUpdateOperationsInput | number
    codigoEntidad?: IntFieldUpdateOperationsInput | number
    codigoCia?: IntFieldUpdateOperationsInput | number
    activo?: IntFieldUpdateOperationsInput | number
  }

  export type SeguridadPersonaUncheckedUpdateInput = {
    codigoColaborador?: IntFieldUpdateOperationsInput | number
    codigoEntidad?: IntFieldUpdateOperationsInput | number
    codigoCia?: IntFieldUpdateOperationsInput | number
    activo?: IntFieldUpdateOperationsInput | number
  }

  export type SeguridadPersonaCreateManyInput = {
    codigoColaborador: number
    codigoEntidad: number
    codigoCia: number
    activo: number
  }

  export type SeguridadPersonaUpdateManyMutationInput = {
    codigoColaborador?: IntFieldUpdateOperationsInput | number
    codigoEntidad?: IntFieldUpdateOperationsInput | number
    codigoCia?: IntFieldUpdateOperationsInput | number
    activo?: IntFieldUpdateOperationsInput | number
  }

  export type SeguridadPersonaUncheckedUpdateManyInput = {
    codigoColaborador?: IntFieldUpdateOperationsInput | number
    codigoEntidad?: IntFieldUpdateOperationsInput | number
    codigoCia?: IntFieldUpdateOperationsInput | number
    activo?: IntFieldUpdateOperationsInput | number
  }

  export type SeguridadSesionCreateInput = {
    idSesion: string
    codigoCia: number
    codigoColaborador: number
    activo: number
    fechaRevocacion?: Date | string | null
    fechaExpiracion: Date | string
  }

  export type SeguridadSesionUncheckedCreateInput = {
    idSesion: string
    codigoCia: number
    codigoColaborador: number
    activo: number
    fechaRevocacion?: Date | string | null
    fechaExpiracion: Date | string
  }

  export type SeguridadSesionUpdateInput = {
    idSesion?: StringFieldUpdateOperationsInput | string
    codigoCia?: IntFieldUpdateOperationsInput | number
    codigoColaborador?: IntFieldUpdateOperationsInput | number
    activo?: IntFieldUpdateOperationsInput | number
    fechaRevocacion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaExpiracion?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SeguridadSesionUncheckedUpdateInput = {
    idSesion?: StringFieldUpdateOperationsInput | string
    codigoCia?: IntFieldUpdateOperationsInput | number
    codigoColaborador?: IntFieldUpdateOperationsInput | number
    activo?: IntFieldUpdateOperationsInput | number
    fechaRevocacion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaExpiracion?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SeguridadSesionCreateManyInput = {
    idSesion: string
    codigoCia: number
    codigoColaborador: number
    activo: number
    fechaRevocacion?: Date | string | null
    fechaExpiracion: Date | string
  }

  export type SeguridadSesionUpdateManyMutationInput = {
    idSesion?: StringFieldUpdateOperationsInput | string
    codigoCia?: IntFieldUpdateOperationsInput | number
    codigoColaborador?: IntFieldUpdateOperationsInput | number
    activo?: IntFieldUpdateOperationsInput | number
    fechaRevocacion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaExpiracion?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SeguridadSesionUncheckedUpdateManyInput = {
    idSesion?: StringFieldUpdateOperationsInput | string
    codigoCia?: IntFieldUpdateOperationsInput | number
    codigoColaborador?: IntFieldUpdateOperationsInput | number
    activo?: IntFieldUpdateOperationsInput | number
    fechaRevocacion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaExpiracion?: DateTimeFieldUpdateOperationsInput | Date | string
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

  export type SeguridadPersonaCodigoCiaCodigoColaboradorCompoundUniqueInput = {
    codigoCia: number
    codigoColaborador: number
  }

  export type SeguridadPersonaCountOrderByAggregateInput = {
    codigoColaborador?: SortOrder
    codigoEntidad?: SortOrder
    codigoCia?: SortOrder
    activo?: SortOrder
  }

  export type SeguridadPersonaAvgOrderByAggregateInput = {
    codigoColaborador?: SortOrder
    codigoEntidad?: SortOrder
    codigoCia?: SortOrder
    activo?: SortOrder
  }

  export type SeguridadPersonaMaxOrderByAggregateInput = {
    codigoColaborador?: SortOrder
    codigoEntidad?: SortOrder
    codigoCia?: SortOrder
    activo?: SortOrder
  }

  export type SeguridadPersonaMinOrderByAggregateInput = {
    codigoColaborador?: SortOrder
    codigoEntidad?: SortOrder
    codigoCia?: SortOrder
    activo?: SortOrder
  }

  export type SeguridadPersonaSumOrderByAggregateInput = {
    codigoColaborador?: SortOrder
    codigoEntidad?: SortOrder
    codigoCia?: SortOrder
    activo?: SortOrder
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
    search?: string
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type SeguridadSesionOrderByRelevanceInput = {
    fields: SeguridadSesionOrderByRelevanceFieldEnum | SeguridadSesionOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type SeguridadSesionCountOrderByAggregateInput = {
    idSesion?: SortOrder
    codigoCia?: SortOrder
    codigoColaborador?: SortOrder
    activo?: SortOrder
    fechaRevocacion?: SortOrder
    fechaExpiracion?: SortOrder
  }

  export type SeguridadSesionAvgOrderByAggregateInput = {
    codigoCia?: SortOrder
    codigoColaborador?: SortOrder
    activo?: SortOrder
  }

  export type SeguridadSesionMaxOrderByAggregateInput = {
    idSesion?: SortOrder
    codigoCia?: SortOrder
    codigoColaborador?: SortOrder
    activo?: SortOrder
    fechaRevocacion?: SortOrder
    fechaExpiracion?: SortOrder
  }

  export type SeguridadSesionMinOrderByAggregateInput = {
    idSesion?: SortOrder
    codigoCia?: SortOrder
    codigoColaborador?: SortOrder
    activo?: SortOrder
    fechaRevocacion?: SortOrder
    fechaExpiracion?: SortOrder
  }

  export type SeguridadSesionSumOrderByAggregateInput = {
    codigoCia?: SortOrder
    codigoColaborador?: SortOrder
    activo?: SortOrder
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
    search?: string
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
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
    search?: string
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
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
    search?: string
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
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

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
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