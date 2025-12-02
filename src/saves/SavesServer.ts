import {DBResult} from "./SavesObject";
import {D1Database, D1Result} from "@cloudflare/workers-types"
import {D1Filter} from "./SavesObject";

export class SavesServer {
    // 更新数据 ####################################################################
    async updateDB(
        DB: D1Database, table: string,
        values: Record<string, any>,
        where: D1Filter): Promise<DBResult> {
        // 构建更新的列和值部分
        const setConditions: string[] = [];
        const whereConditions: string[] = [];
        const params: any[] = [];

        // 构建 SET 部分
        for (const [key, value] of Object.entries(values)) {
            setConditions.push(`${key} = ?`);
            // 检查是否为对象类型，如果是则转换为 JSON 字符串
            const processedValue: string =
                Object.prototype.toString.call(value) === '[object Object]'
                    ? JSON.stringify(value)          // 纯 Record 才转 JSON
                    : String(value);                 // 其余（含数组、基本类型）用 String()
            params.push(processedValue);
        }

        // 构建 WHERE 部分
        for (const [key, clause] of Object.entries(where)) {
            // 支持 { age: { op: '>', value: 18 } } 或 { age: 18 }
            const op = clause?.op ?? '=';
            const val = clause?.value ?? clause;
            whereConditions.push(`${key} ${op} ?`);
            params.push(val);
        }

        // 构建完整的 SQL 更新语句
        let sql = `UPDATE \`${table}\`
                   SET ${setConditions.join(', ')}
                   WHERE ${whereConditions.join(' AND ')}`;

        // console.log('SQL:', sql);
        // console.log('Params:', params);

        try {
            // 执行更新操作
            const result: D1Result = await DB.prepare(sql).bind(...params).run();
            return {flag: true, text: "OK"};
        } catch (e) {
            console.error('Database error:', e);
            return {flag: false, text: (e as Error).message};
            // throw e; // 重新抛出错误以便调用者处理
        }
    }

// 插入数据 ####################################################################
    async insertDB(
        DB: D1Database, table: string,
        values: Record<string, any>): Promise<DBResult> {
        // 构建列名和占位符数组
        const columns: string[] = [];
        const placeholders: string[] = [];
        const params: any[] = [];

        for (const [key, value] of Object.entries(values)) {
            columns.push(key);
            placeholders.push('?');
            // console.log(key, 'Inserting value:', value);
            // 检查是否为对象类型，如果是则转换为 JSON 字符串
            const processedValue: string =
                Object.prototype.toString.call(value) === '[object Object]'
                    ? JSON.stringify(value)          // 纯 Record 才转 JSON
                    : String(value);                 // 其余（含数组、基本类型）用 String()
            params.push(processedValue);
        }

        // 构建完整的 SQL 插入语句
        let sql = `INSERT INTO \`${table}\` (${columns.join(', ')})
                   VALUES (${placeholders.join(', ')})`;
        // console.log('SQL:', sql);
        // console.log('Params:', params);

        try {
            // 执行插入操作
            await DB.prepare(sql).bind(...params).run();
            return {flag: true, text: "OK"};
        } catch (e) {
            console.error('Database error:', e);
            return {flag: false, text: (e as Error).message};
        }
    }

// 查找数据 ################################################################################
    async selectDB(
        DB: D1Database,
        table: string, where: D1Filter): Promise<DBResult> {
        // 构建查询条件数组
        const conditions: string[] = [];
        const params: any[] = [];

        for (const [key, condition] of Object.entries(where)) {
            if (!key || key == "undefined") continue;
            let op = condition.op || '=';
            if (op === 'LIKE') {
                conditions.push(`${key} LIKE ?`);
                params.push(`%${condition.value}%`);
            } else if (op === 'NOT LIKE') {
                conditions.push(`${key} NOT LIKE ?`);
                params.push(`%${condition.value}%`);
            } else if (op === '!=') {
                conditions.push(`${key} != ?`);
                params.push(condition.value);
            } else {
                conditions.push(`${key} = ?`);
                params.push(condition.value);
            }
        }

        // 构建完整的 SQL 查询
        let sql = `SELECT *
                   FROM \`${table}\`
                   WHERE 1 = 1`;
        if (conditions.length > 0) {
            sql += ' AND ' + conditions.join(' AND ');
        }

        // console.log('SQL:', sql);
        // console.log('Params:', params);

        try {
            // 使用参数化查询
            const filteredParams = params.filter(param => param !== undefined);
            // console.log(sql, filteredParams);
            let {results} = await DB.prepare(sql).bind(...filteredParams).all();
            return {flag: true, text: "OK", data: results};

        } catch (e) {
            console.error('Database error:', e);
            return {flag: false, text: (e as Error).message, data: []};
        }
    }

// 删除数据 ###############################################################################
    async deleteDB(
        DB: D1Database, table: string,
        where: D1Filter
    ): Promise<DBResult> {
        const conditions: string[] = [];
        const params: any[] = [];
        if (Object.keys(where).length <= 0) {
            return {flag: false, text: "No conditions provided", data: []};
        }
        for (const [key, value] of Object.entries(where)) {
            conditions.push(`${key} = ?`);
            // console.log("now", key, value);
            if (typeof value === 'object'
                && !Array.isArray(value)
                && value.constructor === Object) {
                params.push(value.value);
                continue;
            }
            params.push(value);
        }

        let sql = `DELETE
                   FROM \`${table}\`
                   WHERE 1 = 1`;
        if (conditions.length > 0) {
            sql += ' AND ' + conditions.join(' AND ');
        }
        // console.log(table, where);
        // console.log('SQL:', sql);
        // console.log('Params:', params);

        try {
            await DB.prepare(sql).bind(...params).run();
            return {flag: true, text: "OK"};
        } catch (e) {
            console.error('Database error:', e);
            return {flag: false, text: (e as Error).message};
            // throw e;
        }
    }
}
