export interface D1Filter {
    [key: string]: {      // 索引签名，允许额外未知 key
        value: unknown;
        op?: string;
    };
}

// 更新数据 ####################################################################
export async function updateDB(
    DB: D1Database, table: string,
    values: Record<string, any>, where: Record<string, any>): Promise<D1Response & {
    results: Record<string, unknown>[]
}> {
    // 构建更新的列和值部分
    const setConditions: string[] = [];
    const whereConditions: string[] = [];
    const params: any[] = [];

    // 构建 SET 部分
    for (const [key, value] of Object.entries(values)) {
        setConditions.push(`${key} = ?`);
        params.push(value);
    }

    // 构建 WHERE 部分
    for (const [key, value] of Object.entries(where)) {
        whereConditions.push(`${key} = ?`);
        params.push(value);
    }

    // 构建完整的 SQL 更新语句
    let sql = `UPDATE ${table}
               SET ${setConditions.join(', ')}
               WHERE ${whereConditions.join(' AND ')}`;

    // console.log('SQL:', sql);
    // console.log('Params:', params);

    try {
        // 执行更新操作
        return await DB.prepare(sql).bind(...params).run();
    } catch (e) {
        console.error('Database error:', e);
        throw e; // 重新抛出错误以便调用者处理
    }
}

// 插入数据 ####################################################################
export async function insertDB(
    DB: D1Database, table: string,
    values: Record<string, any>): Promise<D1Response & { results: Record<string, unknown>[] }> {
    // 构建列名和占位符数组
    const columns: string[] = [];
    const placeholders: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(values)) {
        columns.push(key);
        placeholders.push('?');
        params.push(value);
    }

    // 构建完整的 SQL 插入语句
    let sql = `INSERT INTO ${table} (${columns.join(', ')})
               VALUES (${placeholders.join(', ')})`;

    // console.log('SQL:', sql);
    // console.log('Params:', params);

    try {
        // 执行插入操作
        await DB.prepare(sql).bind(...params).run();
        return true
    } catch (e) {
        console.error('Database error:', e);
        return false;
        // throw e; // 重新抛出错误以便调用者处理
    }
}

// 查找数据 ################################################################################
export async function selectDB(
    DB: D1Database,
    table: string, where: D1Filter) {
    // 构建查询条件数组
    const conditions: string[] = [];
    const params: any[] = [];

    for (const [key, condition] of Object.entries(where)) {
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
               FROM ${table}
               WHERE 1 = 1`;
    if (conditions.length > 0) {
        sql += ' AND ' + conditions.join(' AND ');
    }

    // console.log('SQL:', sql);
    // console.log('Params:', params);

    try {
        // 使用参数化查询
        let {results} = await DB.prepare(sql).bind(...params).all();
        return results;

    } catch (e) {
        console.error('Database error:', e);
        return [];
    }
}

// 删除数据 ###############################################################################
export async function deleteDB(
    DB: D1Database, table: string,
    where: D1Filter
): Promise<boolean> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (Object.keys(where).length <= 0) {
        return false;
    }
    for (const [key, value] of Object.entries(where)) {
        conditions.push(`${key} = ?`);
        params.push(value);
    }

    let sql = `DELETE
               FROM ${table}
               WHERE 1 = 1`;
    if (conditions.length > 0) {
        sql += ' AND ' + conditions.join(' AND ');
    }

    // console.log('SQL:', sql);
    // console.log('Params:', params);

    try {
        await DB.prepare(sql).bind(...params).run();
        return true;
    } catch (e) {
        console.error('Database error:', e);
        return false;
        // throw e;
    }
}