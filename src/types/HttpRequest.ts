export interface Option {
    finder?: string;
    direct?: boolean;
    search?: Record<string, any>,
}

export async function HttpRequest(Method: string = "GET",
                                  WebUrl: string = "/api/login", // 访问的接口
                                  Params: Record<string, string> | string = "",
                                  Header: Record<string, string> | string = "",
                                  Option: Record<string, any> | Option = {}
): Promise<any> {
    try {
        // 请求参数 =====================================================================
        let record_data: string = "";
        let search_data = new URL(WebUrl);
        // POST模式下 参数转换JSON ======================================================
        if (Method == "POST" && Params) {
            if (Params && typeof Params !== "string") {
                Params = Object.fromEntries(Object.entries(Params).map(
                    ([k, v]: [any, any]): [any, any] => [k, String(v ?? '')])
                );
            }
            record_data = new URLSearchParams(Params).toString();
            // record_data = JSON.stringify(Params);
            // console.log(record_data)
        }
        // GET模式下 参数转换搜索 =======================================================
        if (Method == "GET" && Params) {
            if (typeof Params == "string") search_data = new URL(Params);
            else if (typeof Params == "object")
                Object.keys(Params).forEach(key => {
                    search_data.searchParams.append(key,
                        (Params as Record<string, any>)[key]);
                });
        }
        // 添加搜索 =====================================================================
        if (Option.search) {
            Object.keys(Option.search).forEach(key => {
                search_data.searchParams.append(key, Option.search[key]);
            });
        }
        console.log(Params, search_data.href, record_data)
        // 执行请求 =====================================================================
        const default_inf = {'Content-Type': 'application/x-www-form-urlencoded'}
        const header_data: Record<string, any> | any = Header ? Header : default_inf
        // console.log("=== HttpRequest Headers Debug ===")
        // console.log("Headers being sent:", header_data)
        // console.log("=== End Headers Debug ===")
        if (Option.direct) return {url: Method == "GET" ? search_data.href : WebUrl}
        const result_data: Response = await fetch(
            search_data.href, {
                method: Method,
                body: Method == "GET" ? undefined : record_data,
                headers: header_data,
                redirect: Option.finder === "urls" ? 'manual' : undefined,
            }
        );
        try {
            if (Option.finder === "http") return result_data
            if (Option.finder === "urls") return result_data.headers.get('location');
            if (Option.finder === "json") return await result_data.json()
            if (Option.finder === "text") return await result_data.text()
            if (Option.finder === "xml") return xmlToRecord(await result_data.text())
        } catch (e) {
            // console.log(result_data, await result_data.text())
            console.error(e as Error)
            return null
        }
        return result_data;
    } catch (error) {
        return {text: error}
    }
}

import { XMLParser } from "fast-xml-parser";

export function xmlToRecord(xml: string): Record<string, any> {
    const parser = new XMLParser({
        ignoreAttributes: false, // 保留属性（虽然你这段 XML 没有）
        parseAttributeValue: true,
        trimValues: true,
    });

    const parsed = parser.parse(xml);
    // 如果根节点是 <userSession>，直接返回其内容
    return parsed?.userSession ?? parsed;
}