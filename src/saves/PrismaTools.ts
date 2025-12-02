import "dotenv/config";
import {PrismaClient} from '../generated/prisma/client';
import {DBResult} from "./SavesObject";
import {D1Filter} from "./SavesObject";

// 更新数据 ####################################################################
export class PrismaTools {
    async updateDB(
        DB: PrismaClient, table: string,
        values: Record<string, any>,
        where: D1Filter): Promise<DBResult> {

        try {
            // 构建 where 条件
            const whereClause: any = {};
            for (const [key, clause] of Object.entries(where)) {
                const op = clause?.op ?? '=';
                const val = clause?.value ?? clause;

                // 处理不同的操作符
                if (op === '=') {
                    whereClause[key] = val;
                } else if (op === '>') {
                    whereClause[key] = {gt: val};
                } else if (op === '>=') {
                    whereClause[key] = {gte: val};
                } else if (op === '<') {
                    whereClause[key] = {lt: val};
                } else if (op === '<=') {
                    whereClause[key] = {lte: val};
                } else if (op === '!=') {
                    whereClause[key] = {not: val};
                } else if (op === 'LIKE') {
                    whereClause[key] = {contains: val};
                } else if (op === 'NOT LIKE') {
                    whereClause[key] = {not: {contains: val}};
                }
            }

            // 处理 values 中的对象类型
            const processedValues: Record<string, any> = {};
            for (const [key, value] of Object.entries(values)) {
                processedValues[key] =
                    Object.prototype.toString.call(value) === '[object Object]'
                        ? JSON.stringify(value)
                        : value;
            }

            // 使用 Prisma 的动态表访问
            await (DB as any)[table].updateMany({
                where: whereClause,
                data: processedValues
            });

            return {flag: true, text: "OK"};
        } catch (e) {
            console.error('Database error:', e);
            return {flag: false, text: (e as Error).message};
        }
    }

// 插入数据 ####################################################################
    async insertDB(
        DB: PrismaClient, table: string,
        values: Record<string, any>): Promise<DBResult> {

        try {
            // 处理 values 中的对象类型
            const processedValues: Record<string, any> = {};
            for (const [key, value] of Object.entries(values)) {
                processedValues[key] =
                    Object.prototype.toString.call(value) === '[object Object]'
                        ? JSON.stringify(value)
                        : value;
            }

            // 使用 Prisma 的动态表访问
            await (DB as any)[table].create({
                data: processedValues
            });

            return {flag: true, text: "OK"};
        } catch (e) {
            console.error('Database error:', e);
            return {flag: false, text: (e as Error).message};
        }
    }

// 查找数据 ################################################################################
    async selectDB(
        DB: PrismaClient,
        table: string, where: D1Filter): Promise<DBResult> {

        try {
            // 构建 where 条件
            const whereClause: any = {};
            for (const [key, condition] of Object.entries(where)) {
                if (!key || key == "undefined") continue;

                let op = condition.op || '=';
                if (op === 'LIKE') {
                    whereClause[key] = {contains: condition.value};
                } else if (op === 'NOT LIKE') {
                    whereClause[key] = {not: {contains: condition.value}};
                } else if (op === '!=') {
                    whereClause[key] = {not: condition.value};
                } else {
                    whereClause[key] = condition.value;
                }
            }

            // 使用 Prisma 的动态表访问
            const results = await (DB as any)[table].findMany({
                where: whereClause
            });

            return {flag: true, text: "OK", data: results};
        } catch (e) {
            console.error('Database error:', e);
            return {flag: false, text: (e as Error).message, data: []};
        }
    }

// 删除数据 ###############################################################################
    async deleteDB(
        DB: PrismaClient, table: string,
        where: D1Filter
    ): Promise<DBResult> {

        try {
            if (Object.keys(where).length <= 0) {
                return {flag: false, text: "No conditions provided", data: []};
            }

            // 构建 where 条件
            const whereClause: any = {};
            for (const [key, value] of Object.entries(where)) {
                if (typeof value === 'object'
                    && !Array.isArray(value)
                    && value.constructor === Object) {
                    whereClause[key] = value.value;
                } else {
                    whereClause[key] = value;
                }
            }

            // 使用 Prisma 的动态表访问
            await (DB as any)[table].deleteMany({
                where: whereClause
            });

            return {flag: true, text: "OK"};
        } catch (e) {
            console.error('Database error:', e);
            return {flag: false, text: (e as Error).message};
        }
    }
}
