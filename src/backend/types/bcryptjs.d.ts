// Local type declarations for bcryptjs (the @types package is not installed).
declare module "bcryptjs" {
  export function hash(s: string, salt: string | number): Promise<string>
  export function hashSync(s: string, salt: string | number): string
  export function compare(s: string, hash: string): Promise<boolean>
  export function compareSync(s: string, hash: string): boolean
  export function genSalt(rounds?: number): Promise<string>
  export function genSaltSync(rounds?: number): string

  const bcrypt: {
    hash: typeof hash
    hashSync: typeof hashSync
    compare: typeof compare
    compareSync: typeof compareSync
    genSalt: typeof genSalt
    genSaltSync: typeof genSaltSync
  }
  export default bcrypt
}
