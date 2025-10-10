export enum StatusCode {
    SUCCESSFULLY = 0,
    USERS_ERRORS = 1,
    FILES_ERRORS = 2
}

interface PageAction {
    flag: boolean,
    text?: string,
    data?: Record<string, any>
}