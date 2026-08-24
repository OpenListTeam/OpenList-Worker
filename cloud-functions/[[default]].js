var O0 = Object.create
var nn = Object.defineProperty
var $0 = Object.getOwnPropertyDescriptor
var j0 = Object.getOwnPropertyNames
var z0 = Object.getPrototypeOf,
  L0 = Object.prototype.hasOwnProperty
var dr = ((r) =>
  typeof require < "u"
    ? require
    : typeof Proxy < "u"
      ? new Proxy(r, { get: (e, t) => (typeof require < "u" ? require : e)[t] })
      : r)(function (r) {
  if (typeof require < "u") return require.apply(this, arguments)
  throw Error('Dynamic require of "' + r + '" is not supported')
})
var N = (r, e, t) => () => {
  if (t) throw t[0]
  try {
    return (r && (e = r((r = 0))), e)
  } catch (i) {
    throw ((t = [i]), i)
  }
}
var H = (r, e) => () => {
    try {
      return (e || r((e = { exports: {} }).exports, e), e.exports)
    } catch (t) {
      throw ((e = 0), t)
    }
  },
  jt = (r, e) => {
    for (var t in e) nn(r, t, { get: e[t], enumerable: !0 })
  },
  N0 = (r, e, t, i) => {
    if ((e && typeof e == "object") || typeof e == "function")
      for (let s of j0(e))
        !L0.call(r, s) &&
          s !== t &&
          nn(r, s, {
            get: () => e[s],
            enumerable: !(i = $0(e, s)) || i.enumerable,
          })
    return r
  }
var lr = (r, e, t) => (
  (t = r != null ? O0(z0(r)) : {}),
  N0(
    e || !r || !r.__esModule
      ? nn(t, "default", { value: r, enumerable: !0 })
      : t,
    r,
  )
)
var ur,
  an = N(() => {
    ur = class extends Error {
      res
      status
      constructor(r = 500, e) {
        ;(super(e?.message, { cause: e?.cause }),
          (this.res = e?.res),
          (this.status = r))
      }
      getResponse() {
        return this.res
          ? new Response(this.res.body, {
              status: this.status,
              headers: this.res.headers,
            })
          : new Response(this.message, { status: this.status })
      }
    }
  })
var da,
  la = N(() => {
    da = Symbol()
  })
var ua = N(() => {})
var fa,
  pa = N(() => {
    ua()
    fa = (r, e) =>
      new Response(r, {
        headers: {
          "Content-Type": e.replace(/^[^;]+/, (i) => i.toLowerCase()),
        },
      }).formData()
  })
async function M0(r, e) {
  if (!Yr(r) && r.bodyCache.formData) return ha(await r.bodyCache.formData, e)
  let t = Yr(r) ? r.headers : r.raw.headers,
    i = await r.arrayBuffer(),
    s = fa(i, t.get("Content-Type") || "")
  Yr(r) || (r.bodyCache.formData = s)
  let n = await s
  return n ? ha(n, e) : {}
}
function ha(r, e) {
  let t = Object.create(null)
  return (
    r.forEach((i, s) => {
      e.all || s.endsWith("[]") ? H0(t, s, i) : (t[s] = i)
    }),
    e.dot &&
      Object.entries(t).forEach(([i, s]) => {
        i.includes(".") && (K0(t, i, s), delete t[i])
      }),
    t
  )
}
var Yr,
  ga,
  H0,
  K0,
  ma = N(() => {
    pa()
    ;((Yr = (r) => "headers" in r),
      (ga = async (r, e = Object.create(null)) => {
        let { all: t = !1, dot: i = !1 } = e,
          o = (Yr(r) ? r.headers : r.raw.headers)
            .get("Content-Type")
            ?.split(";")[0]
            .trim()
            .toLowerCase()
        return o === "multipart/form-data" ||
          o === "application/x-www-form-urlencoded"
          ? M0(r, { all: t, dot: i })
          : {}
      }))
    ;((H0 = (r, e, t) => {
      r[e] !== void 0
        ? Array.isArray(r[e])
          ? r[e].push(t)
          : (r[e] = [r[e], t])
        : e.endsWith("[]")
          ? (r[e] = [t])
          : (r[e] = t)
    }),
      (K0 = (r, e, t) => {
        if (/(?:^|\.)__proto__\./.test(e)) return
        let i = r,
          s = e.split(".")
        s.forEach((n, o) => {
          o === s.length - 1
            ? (i[n] = t)
            : ((!i[n] ||
                typeof i[n] != "object" ||
                Array.isArray(i[n]) ||
                i[n] instanceof File) &&
                (i[n] = Object.create(null)),
              (i = i[n]))
        })
      }))
  })
var dn,
  ya,
  W0,
  G0,
  Zr,
  wa,
  xa,
  V0,
  ln,
  _a,
  at,
  ei,
  zt,
  cn,
  va,
  ba,
  ka,
  J0,
  xt = N(() => {
    ;((dn = (r) => {
      let e = r.split("/")
      return (e[0] === "" && e.shift(), e)
    }),
      (ya = (r) => {
        let { groups: e, path: t } = W0(r),
          i = dn(t)
        return G0(i, e)
      }),
      (W0 = (r) => {
        let e = []
        return (
          (r = r.replace(/\{[^}]+\}/g, (t, i) => {
            let s = `@${i}`
            return (e.push([s, t]), s)
          })),
          { groups: e, path: r }
        )
      }),
      (G0 = (r, e) => {
        for (let t = e.length - 1; t >= 0; t--) {
          let [i] = e[t]
          for (let s = r.length - 1; s >= 0; s--)
            if (r[s].includes(i)) {
              r[s] = r[s].replace(i, e[t][1])
              break
            }
        }
        return r
      }),
      (Zr = {}),
      (wa = (r, e) => {
        if (r === "*") return "*"
        let t = r.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/)
        if (t) {
          let i = `${r}#${e}`
          return (
            Zr[i] ||
              (t[2]
                ? (Zr[i] =
                    e && e[0] !== ":" && e[0] !== "*"
                      ? [i, t[1], new RegExp(`^${t[2]}(?=/${e})`)]
                      : [r, t[1], new RegExp(`^${t[2]}$`)])
                : (Zr[i] = [r, t[1], !0])),
            Zr[i]
          )
        }
        return null
      }),
      (xa = (r, e) => {
        try {
          return e(r)
        } catch {
          return r.replace(/(?:%[0-9A-Fa-f]{2})+/g, (t) => {
            try {
              return e(t)
            } catch {
              return t
            }
          })
        }
      }),
      (V0 = (r) => xa(r, decodeURI)),
      (ln = (r) => {
        let e = r.url,
          t = e.indexOf("/", e.indexOf(":") + 4),
          i = t
        for (; i < e.length; i++) {
          let s = e.charCodeAt(i)
          if (s === 37) {
            let n = e.indexOf("?", i),
              o = e.indexOf("#", i),
              a =
                n === -1
                  ? o === -1
                    ? void 0
                    : o
                  : o === -1
                    ? n
                    : Math.min(n, o),
              c = e.slice(t, a)
            return V0(c.includes("%25") ? c.replace(/%25/g, "%2525") : c)
          } else if (s === 63 || s === 35) break
        }
        return e.slice(t, i)
      }),
      (_a = (r) => {
        let e = ln(r)
        return e.length > 1 && e.at(-1) === "/" ? e.slice(0, -1) : e
      }),
      (at = (r, e, ...t) => (
        t.length && (e = at(e, ...t)),
        `${r?.[0] === "/" ? "" : "/"}${r}${e === "/" ? "" : `${r?.at(-1) === "/" ? "" : "/"}${e?.[0] === "/" ? e.slice(1) : e}`}`
      )),
      (ei = (r) => {
        if (r.charCodeAt(r.length - 1) !== 63 || !r.includes(":")) return null
        let e = r.split("/"),
          t = [],
          i = ""
        return (
          e.forEach((s) => {
            if (s !== "" && !/\:/.test(s)) i += "/" + s
            else if (/\:/.test(s))
              if (/\?/.test(s)) {
                t.length === 0 && i === "" ? t.push("/") : t.push(i)
                let n = s.replace("?", "")
                ;((i += "/" + n), t.push(i))
              } else i += "/" + s
          }),
          t.filter((s, n, o) => o.indexOf(s) === n)
        )
      }),
      (zt = (r) => (r.indexOf("%") !== -1 ? xa(r, J0) : r)),
      (cn = (r) => (
        r.indexOf("+") !== -1 && (r = r.replace(/\+/g, " ")),
        zt(r)
      )),
      (va = (r, e, t) => {
        let i
        if (!t && e && e.indexOf("%") === -1 && e.indexOf("+") === -1) {
          let o = r.indexOf("?", 8)
          if (o === -1) return
          for (
            r.startsWith(e, o + 1) || (o = r.indexOf(`&${e}`, o + 1));
            o !== -1;
          ) {
            let a = r.charCodeAt(o + e.length + 1)
            if (a === 61) {
              let c = o + e.length + 2,
                d = r.indexOf("&", c)
              return cn(r.slice(c, d === -1 ? void 0 : d))
            } else if (a == 38 || isNaN(a)) return ""
            o = r.indexOf(`&${e}`, o + 1)
          }
          if (((i = /[%+]/.test(r)), !i)) return
        }
        let s = Object.create(null)
        i ??= /[%+]/.test(r)
        let n = r.indexOf("?", 8)
        for (; n !== -1; ) {
          let o = r.indexOf("&", n + 1),
            a = r.indexOf("=", n)
          a > o && o !== -1 && (a = -1)
          let c = r.slice(n + 1, a === -1 ? (o === -1 ? void 0 : o) : a)
          if ((i && (c = cn(c)), (n = o), c === "")) continue
          let d
          ;(a === -1
            ? (d = "")
            : ((d = r.slice(a + 1, o === -1 ? void 0 : o)), i && (d = cn(d))),
            t
              ? ((s[c] && Array.isArray(s[c])) || (s[c] = []), s[c].push(d))
              : (s[c] ??= d))
        }
        return e ? s[e] : s
      }),
      (ba = va),
      (ka = (r, e) => va(r, e, !0)),
      (J0 = decodeURIComponent))
  })
var Sa,
  Pa = N(() => {
    an()
    la()
    ma()
    xt()
    Sa = class {
      raw
      #t
      #e
      routeIndex = 0
      path
      bodyCache = {}
      constructor(r, e = "/", t = [[]]) {
        ;((this.raw = r), (this.path = e), (this.#e = t))
      }
      param(r) {
        return r ? this.#r(r) : this.#n()
      }
      #r(r) {
        let e = this.#e[0][this.routeIndex][1][r],
          t = this.#i(e)
        return t && zt(t)
      }
      #n() {
        let r = {},
          e = Object.keys(this.#e[0][this.routeIndex][1])
        for (let t of e) {
          let i = this.#i(this.#e[0][this.routeIndex][1][t])
          i !== void 0 && (r[t] = zt(i))
        }
        return r
      }
      #i(r) {
        return this.#e[1] ? this.#e[1][r] : r
      }
      query(r) {
        return ba(this.url, r)
      }
      queries(r) {
        return ka(this.url, r)
      }
      header(r) {
        if (r) return this.raw.headers.get(r) ?? void 0
        let e = Object.create(null)
        return (
          this.raw.headers.forEach((t, i) => {
            e[i] = t
          }),
          e
        )
      }
      async parseBody(r) {
        return ga(this, r)
      }
      #s = (r) => {
        let { bodyCache: e, raw: t } = this,
          i = e[r]
        if (i) return i
        for (let s in e)
          return e[s].then(
            (n) => (
              s === "json" && (n = JSON.stringify(n)),
              new Response(n)[r]()
            ),
          )
        return (e[r] = t[r]())
      }
      json() {
        return this.#s("text").then((r) => JSON.parse(r))
      }
      text() {
        return this.#s("text")
      }
      arrayBuffer() {
        return this.#s("arrayBuffer")
      }
      bytes() {
        return this.#s("arrayBuffer").then((r) => new Uint8Array(r))
      }
      blob() {
        return this.#s("blob")
      }
      formData() {
        return this.#s("formData")
      }
      addValidatedData(r, e) {
        ;(this.#t ??= {})[r] = e
      }
      valid(r) {
        return this.#t?.[r]
      }
      get url() {
        return this.raw.url
      }
      get method() {
        return this.raw.method
      }
      get [da]() {
        return this.#e
      }
      get matchedRoutes() {
        return this.#e[0].map(([[, r]]) => r)
      }
      get routePath() {
        return this.#e[0].map(([[, r]]) => r)[this.routeIndex].path
      }
    }
  })
var Aa,
  Q0,
  un,
  Ca = N(() => {
    ;((Aa = { Stringify: 1, BeforeStream: 2, Stream: 3 }),
      (Q0 = (r, e) => {
        let t = new String(r)
        return ((t.isEscaped = !0), (t.callbacks = e), t)
      }),
      (un = async (r, e, t, i, s) => {
        typeof r == "object" &&
          !(r instanceof String) &&
          (r instanceof Promise || (r = r.toString()),
          r instanceof Promise && (r = await r))
        let n = r.callbacks
        if (!n?.length) return Promise.resolve(r)
        s ? (s[0] += r) : (s = [r])
        let o = Promise.all(
          n.map((a) => a({ phase: e, buffer: s, context: i })),
        ).then((a) =>
          Promise.all(a.filter(Boolean).map((c) => un(c, e, !1, i, s))).then(
            () => s[0],
          ),
        )
        return t ? Q0(await o, n) : o
      }))
  })
var X0,
  fn,
  fr,
  pn,
  ti = N(() => {
    Pa()
    Ca()
    ;((X0 = "text/plain; charset=UTF-8"),
      (fn = (r, e) => ({ "Content-Type": r, ...e })),
      (fr = (r, e) => new Response(r, e)),
      (pn = class {
        #t
        #e
        env = {}
        #r
        finalized = !1
        error
        #n
        #i
        #s
        #l
        #c
        #d
        #a
        #u
        #f
        constructor(r, e) {
          ;((this.#t = r),
            e &&
              ((this.#i = e.executionCtx),
              (this.env = e.env),
              (this.#d = e.notFoundHandler),
              (this.#f = e.path),
              (this.#u = e.matchResult)))
        }
        get req() {
          return ((this.#e ??= new Sa(this.#t, this.#f, this.#u)), this.#e)
        }
        get event() {
          if (this.#i && "respondWith" in this.#i) return this.#i
          throw Error("This context has no FetchEvent")
        }
        get executionCtx() {
          if (this.#i) return this.#i
          throw Error("This context has no ExecutionContext")
        }
        get res() {
          return (this.#s ||= fr(null, {
            headers: (this.#a ??= new Headers()),
          }))
        }
        set res(r) {
          if (this.#s && r) {
            r = fr(r.body, r)
            for (let [e, t] of this.#s.headers.entries())
              if (e !== "content-type")
                if (e === "set-cookie") {
                  let i = this.#s.headers.getSetCookie()
                  r.headers.delete("set-cookie")
                  for (let s of i) r.headers.append("set-cookie", s)
                } else r.headers.set(e, t)
          }
          ;((this.#s = r), (this.finalized = !0))
        }
        render = (...r) => ((this.#c ??= (e) => this.html(e)), this.#c(...r))
        setLayout = (r) => (this.#l = r)
        getLayout = () => this.#l
        setRenderer = (r) => {
          this.#c = r
        }
        header = (r, e, t) => {
          this.finalized && (this.#s = fr(this.#s.body, this.#s))
          let i = this.#s ? this.#s.headers : (this.#a ??= new Headers())
          e === void 0 ? i.delete(r) : t?.append ? i.append(r, e) : i.set(r, e)
        }
        status = (r) => {
          this.#n = r
        }
        set = (r, e) => {
          ;((this.#r ??= new Map()), this.#r.set(r, e))
        }
        get = (r) => (this.#r ? this.#r.get(r) : void 0)
        get var() {
          return this.#r ? Object.fromEntries(this.#r) : {}
        }
        #o(r, e, t) {
          let i = this.#s ? new Headers(this.#s.headers) : this.#a
          if (typeof e == "object" && e.headers) {
            i ??= new Headers()
            for (let [n, o] of new Headers(e.headers))
              n === "set-cookie" ? i.append(n, o) : i.set(n, o)
          }
          if (t) {
            if (!i) {
              let n = 0
              for (let o in t)
                if (++n > 1 || typeof t[o] != "string") {
                  i = new Headers()
                  break
                }
            }
            if (i)
              for (let n in t) {
                let o = t[n]
                if (typeof o == "string") i.set(n, o)
                else {
                  i.delete(n)
                  for (let a of o) i.append(n, a)
                }
              }
          }
          let s = typeof e == "number" ? e : (e?.status ?? this.#n)
          return fr(r, { status: s, headers: i ?? t })
        }
        newResponse = (...r) => this.#o(...r)
        body = (r, e, t) => this.#o(r, e, t)
        text = (r, e, t) =>
          !this.#a && !this.#n && !e && !t && !this.finalized
            ? new Response(r)
            : this.#o(r, e, fn(X0, t))
        json = (r, e, t) =>
          this.#o(JSON.stringify(r), e, fn("application/json", t))
        html = (r, e, t) => {
          let i = (s) => this.#o(s, e, fn("text/html; charset=UTF-8", t))
          return typeof r == "object"
            ? un(r, Aa.Stringify, !1, {}).then(i)
            : i(r)
        }
        redirect = (r, e) => {
          let t = String(r)
          return (
            this.header("Location", /[^\x00-\xFF]/.test(t) ? encodeURI(t) : t),
            this.newResponse(null, e ?? 302)
          )
        }
        notFound = () => ((this.#d ??= () => fr()), this.#d(this))
      }))
  })
var oc = H((Ym, nc) => {
  "use strict"
  var Pn = Object.defineProperty,
    rf = Object.getOwnPropertyDescriptor,
    sf = Object.getOwnPropertyNames,
    nf = Object.prototype.hasOwnProperty,
    of = (r, e) => {
      for (var t in e) Pn(r, t, { get: e[t], enumerable: !0 })
    },
    af = (r, e, t, i) => {
      if ((e && typeof e == "object") || typeof e == "function")
        for (let s of sf(e))
          !nf.call(r, s) &&
            s !== t &&
            Pn(r, s, {
              get: () => e[s],
              enumerable: !(i = rf(e, s)) || i.enumerable,
            })
      return r
    },
    cf = (r) => af(Pn({}, "__esModule", { value: !0 }), r),
    Ja = {}
  of(Ja, {
    InvalidKeyError: () => ci,
    InvalidStoreNameError: () => xr,
    MissingProjectIdError: () => Qa,
    PagesBlobError: () => He,
    PreconditionFailedError: () => bn,
    QuotaExceededError: () => df,
    RateLimitedError: () => lf,
    Store: () => Xa,
    getStore: () => Df,
    listStores: () => Ff,
  })
  nc.exports = cf(Ja)
  var He = class extends Error {
      code
      constructor(r, e) {
        ;(super(`PagesBlob: ${e}`),
          (this.name = "PagesBlobError"),
          (this.code = r))
      }
    },
    ci = class extends He {
      constructor(r) {
        super("INVALID_KEY", r)
      }
    },
    xr = class extends He {
      constructor(r) {
        super("INVALID_STORE_NAME", r)
      }
    },
    xn = class extends He {
      constructor(r) {
        super(
          "MISSING_ENVIRONMENT",
          `Environment not configured for Pages Blob. Missing: ${r.join(", ")}. Supply these properties when creating a store, or ensure the function is running in a Pages environment.`,
        )
      }
    },
    df = class extends He {
      constructor() {
        super("QUOTA_EXCEEDED", "storage quota exceeded")
      }
    },
    lf = class extends He {
      constructor() {
        super("RATE_LIMITED", "request rate limited, please retry later")
      }
    },
    Qa = class extends He {
      constructor() {
        super(
          "MISSING_PROJECT_ID",
          "projectId is required when using API token mode. Please supply { name, projectId, token } to getStore() / listStores().",
        )
      }
    },
    dt = class extends He {
      constructor(r) {
        super("CREDENTIAL_ERROR", r)
      }
    },
    me = class extends He {
      constructor(r, e) {
        super("COS_ERROR", `COS returned ${r}: ${e}`)
      }
    },
    bn = class extends He {
      constructor() {
        super(
          "PRECONDITION_FAILED",
          "conditional write failed (key already exists)",
        )
      }
    }
  function vt(r) {
    if (r === "") throw new ci("Blob key must not be empty.")
    if (r.startsWith("/") || r.startsWith("%2F"))
      throw new ci("Blob key must not start with forward slash (/).")
    if (new TextEncoder().encode(r).length > 600)
      throw new ci(
        "Blob key must be a sequence of Unicode characters whose UTF-8 encoding is at most 600 bytes long.",
      )
  }
  function uf(r) {
    if (r === "") throw new xr("Store name must not be empty.")
    if (r.includes("/") || r.includes(":"))
      throw new xr(
        "Store name must not contain forward slashes (/) or colons (:).",
      )
    if (!/^[a-zA-Z0-9_-]+$/.test(r))
      throw new xr(
        "Store name must only contain letters, digits, underscores, and hyphens.",
      )
    if (new TextEncoder().encode(r).length > 64)
      throw new xr(
        "Store name must be a sequence of Unicode characters whose UTF-8 encoding is at most 64 bytes long.",
      )
  }
  var Xa = class {
      cosClient
      storeName
      defaultConsistency
      constructor(r, e, t = "eventual") {
        ;((this.cosClient = r),
          (this.storeName = e),
          (this.defaultConsistency = t))
      }
      resolveConsistency(r) {
        return r ?? this.defaultConsistency
      }
      async set(r, e, t) {
        vt(r)
        let i = await this.cosClient.putObject(this.storeName, r, e, {
          onlyIfNew: t?.onlyIfNew,
          cacheControl: t?.cacheControl,
        })
        if (t?.onlyIfNew && i.statusCode === 412) throw new bn()
      }
      async setJSON(r, e, t) {
        vt(r)
        let i = JSON.stringify(e),
          s = await this.cosClient.putObject(this.storeName, r, i, {
            onlyIfNew: t?.onlyIfNew,
            contentType: "application/json",
            cacheControl: t?.cacheControl,
          })
        if (t?.onlyIfNew && s.statusCode === 412) throw new bn()
      }
      async createUploadUrl(r, e) {
        vt(r)
        let { url: t, expiresAt: i } =
          await this.cosClient.createPresignedPutUrl(this.storeName, r, {
            expireSeconds: e?.expireSeconds,
            contentType: e?.contentType,
          })
        return { url: t, key: r, expiresAt: i }
      }
      async get(r, e) {
        vt(r)
        let t = this.resolveConsistency(e?.consistency),
          i = await this.cosClient.getObject(this.storeName, r, t)
        if (i === null) return null
        let { body: s } = i,
          n = e?.type ?? "text",
          o = new TextDecoder("utf-8")
        switch (n) {
          case "text":
            return o.decode(s)
          case "json":
            return JSON.parse(o.decode(s))
          case "arrayBuffer":
            return s.buffer.slice(s.byteOffset, s.byteOffset + s.byteLength)
          case "blob":
            return new Blob([s])
          case "stream":
            return new ReadableStream({
              start(a) {
                ;(a.enqueue(s), a.close())
              },
            })
          default:
            return o.decode(s)
        }
      }
      async getMetadata(r, e) {
        vt(r)
        let t = this.resolveConsistency(e?.consistency)
        return this.cosClient.headObject(this.storeName, r, t)
      }
      async getWithHeaders(r, e) {
        vt(r)
        let t = this.resolveConsistency(e?.consistency),
          i = await this.cosClient.getObject(this.storeName, r, t)
        return i
          ? {
              body: new TextDecoder("utf-8").decode(i.body),
              headers: i.headers || {},
            }
          : null
      }
      async delete(r) {
        ;(vt(r), await this.cosClient.deleteObject(this.storeName, r))
      }
      async list(r) {
        let e = r?.paginate !== !1,
          t = r?.limit,
          i = [],
          s = [],
          n = this.resolveConsistency(r?.consistency),
          o = r?.cursor || "",
          a = !0,
          c
        for (; a; ) {
          let d = t !== void 0 ? t - i.length : 1e3,
            l = Math.min(d, 1e3)
          if (l <= 0) break
          let u = await this.cosClient.listObjects(this.storeName, {
            prefix: r?.prefix,
            delimiter: r?.directories ? "/" : void 0,
            marker: o || void 0,
            maxKeys: l,
            consistency: n,
          })
          for (let f of u.contents) i.push({ key: f.key, etag: f.etag })
          ;(s.push(...u.commonPrefixes),
            t !== void 0 && i.length >= t
              ? ((i.length = t),
                (u.isTruncated || u.contents.length === l) &&
                  (c = u.nextMarker),
                (a = !1))
              : u.isTruncated
                ? !e && t === void 0
                  ? ((c = u.nextMarker), (a = !1))
                  : (o = u.nextMarker)
                : (a = !1))
        }
        return { blobs: i, directories: s, ...(c ? { cursor: c } : {}) }
      }
    },
    ff = new TextEncoder()
  function kn(r) {
    let e = ff.encode(r),
      t = new ArrayBuffer(e.byteLength),
      i = new Uint8Array(t)
    return (i.set(e), i)
  }
  function Ya(r) {
    let e = r instanceof Uint8Array ? r : new Uint8Array(r),
      t = ""
    for (let i = 0; i < e.length; i++) t += e[i].toString(16).padStart(2, "0")
    return t
  }
  async function La(r, e) {
    let t = await crypto.subtle.importKey(
        "raw",
        kn(r),
        { name: "HMAC", hash: "SHA-1" },
        !1,
        ["sign"],
      ),
      i = await crypto.subtle.sign("HMAC", t, kn(e))
    return Ya(i)
  }
  async function pf(r) {
    let e = await crypto.subtle.digest("SHA-1", kn(r))
    return Ya(e)
  }
  function di(r) {
    return encodeURIComponent(r).replace(
      /[!'()*]/g,
      (e) => "%" + e.charCodeAt(0).toString(16).toUpperCase(),
    )
  }
  function li(r) {
    try {
      return decodeURIComponent(r)
    } catch {
      return r
    }
  }
  function Za(r) {
    return r
      .split("/")
      .map((e) => li(e))
      .join("/")
  }
  function ec(r) {
    return r
      .split("/")
      .map((e) => di(li(e)))
      .join("/")
  }
  var hf = new Set([
    "cache-control",
    "content-disposition",
    "content-encoding",
    "content-length",
    "content-md5",
    "content-type",
    "expect",
    "expires",
    "if-match",
    "if-modified-since",
    "if-none-match",
    "if-unmodified-since",
    "origin",
    "range",
    "transfer-encoding",
  ])
  function gf(r) {
    return r === "host" || r === "x-cos-security-token"
      ? !1
      : !!(hf.has(r) || r.startsWith("x-cos-"))
  }
  function Na(r) {
    if (!r) return []
    let e = []
    for (let [t, i] of Object.entries(r))
      i != null && e.push([t.toLowerCase(), String(i)])
    return (e.sort(([t], [i]) => (t < i ? -1 : t > i ? 1 : 0)), e)
  }
  function Ma(r) {
    return r.map(([e, t]) => `${di(e)}=${di(t)}`).join("&")
  }
  function Ha(r) {
    return r.map(([e]) => di(e)).join(";")
  }
  async function tc(r) {
    let e = r.method.toLowerCase(),
      t = r.pathname.startsWith("/") ? r.pathname : `/${r.pathname}`,
      i = Math.floor(Date.now() / 1e3),
      s = i + (r.expireSeconds ?? 3600),
      n = `${i};${s}`,
      o = Na(r.headers).filter(([y]) => gf(y)),
      a = Ha(o),
      c = Ma(o),
      d = Na(r.query),
      l = Ha(d),
      u = Ma(d),
      f = `${e}
${t}
${u}
${c}
`,
      p = `sha1
${n}
${await pf(f)}
`,
      h = await La(r.secretKey, n),
      m = await La(h, p),
      w = [
        "q-sign-algorithm=sha1",
        `q-ak=${r.secretId}`,
        `q-sign-time=${n}`,
        `q-key-time=${n}`,
        `q-header-list=${a}`,
        `q-url-param-list=${l}`,
        `q-signature=${m}`,
      ].join("&"),
      g = {}
    for (let [y, v] of o) g[y] = v
    return { authorization: w, signedHeaders: g }
  }
  async function mf(r) {
    let e = new URL(r.domain),
      t = li(r.key),
      i = `/${Za(t)}`,
      s = `/${ec(t)}`
    e.pathname = s
    let { authorization: n } = await tc({
      method: r.method,
      pathname: i,
      query: r.query,
      headers: r.headers,
      secretId: r.credential.secretId,
      secretKey: r.credential.secretKey,
      expireSeconds: r.expireSeconds,
    })
    if (r.query)
      for (let [o, a] of Object.entries(r.query))
        a != null && e.searchParams.set(o, String(a))
    for (let o of n.split("&")) {
      let a = o.indexOf("=")
      if (a === -1) continue
      let c = o.slice(0, a),
        d = o.slice(a + 1)
      e.searchParams.set(c, d)
    }
    return (
      r.credential.sessionToken &&
        e.searchParams.set("x-cos-security-token", r.credential.sessionToken),
      e.toString()
    )
  }
  async function hr(r) {
    let e = new URL(r.domain),
      t = r.key ? li(r.key) : "",
      i = t ? `/${Za(t)}` : "/",
      s = t ? `/${ec(t)}` : "/"
    if (((e.pathname = s), r.query))
      for (let [u, f] of Object.entries(r.query))
        f != null && e.searchParams.set(u, String(f))
    let { authorization: n } = await tc({
        method: r.method,
        pathname: i,
        query: r.query,
        headers: r.headers,
        secretId: r.credential.secretId,
        secretKey: r.credential.secretKey,
      }),
      o = new Headers()
    if (r.headers)
      for (let [u, f] of Object.entries(r.headers))
        f != null && o.set(u, String(f))
    ;(o.set("Authorization", n),
      r.credential.sessionToken &&
        o.set("x-cos-security-token", r.credential.sessionToken))
    let a = e.toString(),
      c = {
        method: r.method,
        headers: o,
        body: r.body ?? void 0,
        signal: r.signal,
      },
      d = 2,
      l
    for (let u = 0; u <= d; u++)
      try {
        return await fetch(a, c)
      } catch (f) {
        if (((l = f), f instanceof DOMException && f.name === "AbortError"))
          throw f
        u < d && (await new Promise((p) => setTimeout(p, 1e3 * (u + 1))))
      }
    throw l
  }
  var yf = "blob.edgeone.site",
    wf = "blob-nocache.edgeone.site",
    rc = class qe {
      credentialManager
      bucket = ""
      region = ""
      keyPrefix = ""
      cachedDomain = ""
      uncachedDomain = ""
      initialized = !1
      static buildErrorDetail(e, t, i, s, n) {
        let o = i ? `${t}/${i}` : t,
          a = n ? ` [request-id: ${n}]` : ""
        return `${e} ${o} - ${xf(s)}${a}`
      }
      constructor(e) {
        this.credentialManager = e
      }
      computeSubdomain(e) {
        let t = []
        if (
          (e.appId && t.push(e.appId),
          e.zoneId && t.push(e.zoneId),
          e.projectId && t.push(e.projectId),
          t.length >= 2)
        )
          return t.join("-")
        if (e.resourcePrefix) {
          let i = e.resourcePrefix
            .replace(/\/?\*$/, "")
            .split("/")
            .filter(Boolean)
          if (i.length >= 2) return i.slice(0, Math.min(i.length, 3)).join("-")
        }
        return ""
      }
      async ensureInitialized() {
        if (this.initialized) return
        let e = await this.credentialManager.getCredential()
        !this.keyPrefix &&
          e.resourcePrefix &&
          (this.keyPrefix = e.resourcePrefix.replace(/\/?\*$/, ""))
        let t = e.edgeRegion === "CN",
          i = e.cosMainland,
          s = e.cosOverseas,
          n = t ? i || s : s || i
        !this.bucket &&
          n &&
          ((this.bucket = n.bucket), (this.region = n.region))
        let o = this.computeSubdomain(e)
        if (!o)
          throw new me(
            0,
            "unable to derive tenant subdomain from credential; missing appId/zoneId/projectId or resourcePrefix",
          )
        ;((this.cachedDomain = `https://${o}.${yf}`),
          (this.uncachedDomain = `https://${o}.${wf}`),
          (this.initialized = !0))
      }
      async resolveDomain(e) {
        return (
          await this.ensureInitialized(),
          e === "strong" ? this.uncachedDomain : this.cachedDomain
        )
      }
      async resolveCredential() {
        let e = await this.credentialManager.getCredential()
        return {
          secretId: e.tmpSecretId,
          secretKey: e.tmpSecretKey,
          sessionToken: e.sessionToken,
        }
      }
      buildCosKey(e, t) {
        return `${this.keyPrefix}/${e}/${t}`
      }
      async getDomains() {
        return (
          await this.ensureInitialized(),
          { cached: this.cachedDomain, uncached: this.uncachedDomain }
        )
      }
      async putObject(e, t, i, s) {
        let n = await this.resolveDomain("strong"),
          o = await this.resolveCredential(),
          a = this.buildCosKey(e, t),
          c =
            s?.cacheControl === null
              ? void 0
              : (s?.cacheControl ?? "max-age=0, stale-while-revalidate=60"),
          d = {}
        ;(s?.onlyIfNew && (d["If-None-Match"] = "*"),
          c && (d["Cache-Control"] = c),
          s?.contentType && (d["Content-Type"] = s.contentType))
        try {
          let l = await hr({
            domain: n,
            method: "PUT",
            key: a,
            headers: d,
            body: i,
            credential: o,
          })
          if (l.status === 412)
            return (
              await l.arrayBuffer().catch(() => {}),
              { etag: "", statusCode: 412 }
            )
          if (!l.ok) {
            let f = await gr(l)
            throw new me(
              l.status,
              qe.buildErrorDetail(
                "PUT",
                n,
                a,
                f || `status ${l.status}`,
                mr(l),
              ),
            )
          }
          let u = l.headers.get("etag") || ""
          return (
            await l.arrayBuffer().catch(() => {}),
            { etag: u, statusCode: l.status }
          )
        } catch (l) {
          throw l instanceof me
            ? l
            : new me(0, qe.buildErrorDetail("PUT", n, a, yr(l)))
        }
      }
      async createPresignedPutUrl(e, t, i) {
        let s = await this.resolveDomain("strong"),
          n = await this.resolveCredential(),
          o = this.buildCosKey(e, t),
          a = {}
        i?.contentType && (a["Content-Type"] = i.contentType)
        let c = i?.expireSeconds ?? 3600,
          d = await mf({
            domain: s,
            method: "PUT",
            key: o,
            headers: a,
            credential: n,
            expireSeconds: c,
          }),
          l = Math.floor(Date.now() / 1e3) + c
        return { url: d, expiresAt: l }
      }
      async getObject(e, t, i) {
        let s = await this.resolveDomain(i),
          n = await this.resolveCredential(),
          o = this.buildCosKey(e, t)
        try {
          let a = await hr({ domain: s, method: "GET", key: o, credential: n })
          if (a.status === 404)
            return (await a.arrayBuffer().catch(() => {}), null)
          if (!a.ok) {
            let l = await gr(a)
            throw new me(
              a.status,
              qe.buildErrorDetail(
                "GET",
                s,
                o,
                l || `status ${a.status}`,
                mr(a),
              ),
            )
          }
          let c = new Uint8Array(await a.arrayBuffer()),
            d = Ka(a.headers)
          return { body: c, contentType: d["content-type"], headers: d }
        } catch (a) {
          throw a instanceof me
            ? a
            : new me(0, qe.buildErrorDetail("GET", s, o, yr(a)))
        }
      }
      async headObject(e, t, i) {
        let s = await this.resolveDomain(i),
          n = await this.resolveCredential(),
          o = this.buildCosKey(e, t)
        try {
          let a = await hr({ domain: s, method: "HEAD", key: o, credential: n })
          if (a.status === 404) return null
          if (!a.ok) {
            let d = await gr(a)
            throw new me(
              a.status,
              qe.buildErrorDetail(
                "HEAD",
                s,
                o,
                d || `status ${a.status}`,
                mr(a),
              ),
            )
          }
          let c = Ka(a.headers)
          return {
            cacheControl: c["cache-control"],
            contentType: c["content-type"],
            etag: c.etag,
            headers: c,
          }
        } catch (a) {
          throw a instanceof me
            ? a
            : new me(0, qe.buildErrorDetail("HEAD", s, o, yr(a)))
        }
      }
      async deleteObject(e, t) {
        let i = await this.resolveDomain("strong"),
          s = await this.resolveCredential(),
          n = this.buildCosKey(e, t)
        try {
          let o = await hr({
            domain: i,
            method: "DELETE",
            key: n,
            credential: s,
          })
          if (o.status === 204 || o.status === 404 || o.ok) {
            await o.arrayBuffer().catch(() => {})
            return
          }
          let a = await gr(o)
          throw new me(
            o.status,
            qe.buildErrorDetail(
              "DELETE",
              i,
              n,
              a || `status ${o.status}`,
              mr(o),
            ),
          )
        } catch (o) {
          throw o instanceof me
            ? o
            : new me(0, qe.buildErrorDetail("DELETE", i, n, yr(o)))
        }
      }
      async listObjects(e, t) {
        await this.ensureInitialized()
        let i = `${this.keyPrefix}/${e}/`,
          s = t?.prefix ? i + t.prefix : i,
          n = await this.getBucketRaw({
            prefix: s,
            delimiter: t?.delimiter,
            marker: t?.marker,
            maxKeys: t?.maxKeys,
            consistency: t?.consistency,
          }),
          o = n.contents
            .map((c) => {
              let d = c.key,
                l = d.startsWith(i) ? d.slice(i.length) : d
              return l ? { key: l, etag: c.etag } : null
            })
            .filter((c) => c !== null),
          a = n.commonPrefixes
            .map((c) => (c.startsWith(i) ? c.slice(i.length) : c))
            .filter((c) => !!c)
        return {
          contents: o,
          commonPrefixes: a,
          isTruncated: n.isTruncated,
          nextMarker: n.nextMarker,
        }
      }
      async listStores(e) {
        let t = [],
          i = "",
          s = !0
        for (; s; ) {
          await this.ensureInitialized()
          let n = `${this.keyPrefix}/`,
            o = await this.getBucketRaw({
              prefix: n,
              delimiter: "/",
              maxKeys: 1e3,
              marker: i || void 0,
              consistency: e,
            })
          for (let a of o.commonPrefixes) {
            let c = a.startsWith(n) ? a.slice(n.length, -1) : a.slice(0, -1)
            c && t.push(c)
          }
          if (((s = o.isTruncated), (i = o.nextMarker), !s || !i)) break
        }
        return t
      }
      async getBucketRaw(e) {
        let t = await this.resolveDomain(e.consistency),
          i = await this.resolveCredential(),
          s = { prefix: e.prefix }
        ;(e.delimiter && (s.delimiter = e.delimiter),
          e.marker && (s.marker = e.marker),
          e.maxKeys && (s["max-keys"] = e.maxKeys))
        try {
          let n = await hr({
            domain: t,
            method: "GET",
            query: s,
            credential: i,
          })
          if (!n.ok) {
            let a = await gr(n)
            throw new me(
              n.status,
              qe.buildErrorDetail(
                "LIST",
                t,
                e.prefix,
                a || `status ${n.status}`,
                mr(n),
              ),
            )
          }
          let o = await n.text()
          return _f(o)
        } catch (n) {
          throw n instanceof me
            ? n
            : new me(0, qe.buildErrorDetail("LIST", t, e.prefix, yr(n)))
        }
      }
    }
  function xf(r) {
    return r
      .replace(
        /[a-zA-Z0-9\-]+\.cos\.[a-zA-Z0-9\-.]+\.myqcloud\.com/gi,
        "[cos-origin]",
      )
      .replace(
        /[a-zA-Z0-9\-]+\.cos\.[a-zA-Z0-9\-.]+\.tencentcos\.cn/gi,
        "[cos-origin]",
      )
  }
  async function gr(r) {
    try {
      return await r.text()
    } catch {
      return ""
    }
  }
  function mr(r) {
    return (
      r.headers.get("x-cos-request-id") ||
      r.headers.get("x-eo-log-id") ||
      void 0
    )
  }
  function yr(r) {
    let e = r,
      t = e.message || String(r),
      i = e.cause
    if (i) {
      let s = i.message || i.code || ""
      return s ? `${t} (${s})` : t
    }
    return t
  }
  function Ka(r) {
    let e = {}
    return (
      r.forEach((t, i) => {
        e[i.toLowerCase()] = t
      }),
      e
    )
  }
  function _f(r) {
    let e = [],
      t = /<Contents>([\s\S]*?)<\/Contents>/g,
      i
    for (; (i = t.exec(r)) !== null; ) {
      let c = i[1],
        d = wr(c, "Key"),
        l = wr(c, "ETag")
      d !== null && e.push({ key: _n(d), etag: l || "" })
    }
    let s = [],
      n = /<CommonPrefixes>([\s\S]*?)<\/CommonPrefixes>/g
    for (; (i = n.exec(r)) !== null; ) {
      let c = i[1],
        d = wr(c, "Prefix")
      d !== null && s.push(_n(d))
    }
    let o = wr(r, "IsTruncated") === "true",
      a = wr(r, "NextMarker") || ""
    return { contents: e, commonPrefixes: s, isTruncated: o, nextMarker: _n(a) }
  }
  function wr(r, e) {
    let t = new RegExp(`<${e}>([\\s\\S]*?)<\\/${e}>`).exec(r)
    return t ? t[1] : null
  }
  function _n(r) {
    return r
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&")
  }
  var vf = "X-RateLimit-Reset"
  async function Sn(r, e, t = 2) {
    e.signal?.throwIfAborted?.()
    try {
      let i = await fetch(r, e)
      if (t > 0 && (i.status === 429 || i.status >= 500)) {
        let s = Wa(i.headers.get(vf))
        return (await Ga(s, e.signal), Sn(r, e, t - 1))
      }
      return i
    } catch (i) {
      if (t === 0 || (i instanceof DOMException && i.name === "AbortError"))
        throw i
      let s = Wa()
      return (await Ga(s, e.signal), Sn(r, e, t - 1))
    }
  }
  function Wa(r) {
    return r ? Math.max(Number(r) * 1e3 - Date.now(), 500) : 1500
  }
  function Ga(r, e) {
    return new Promise((t, i) => {
      if (e?.aborted) return i(e.reason)
      let s = setTimeout(() => {
          ;(e?.removeEventListener("abort", n), t())
        }, r),
        n = () => {
          ;(clearTimeout(s), i(e.reason))
        }
      e?.addEventListener("abort", n, { once: !0 })
    })
  }
  var bf = "prod"
  function kf() {
    let r = typeof process < "u" ? process.env.PAGES_BLOB_STS_ENV : void 0
    return r === "test" || r === "prod" ? r : bf
  }
  var Sf = 300,
    Pf = "https://blob-sts.edgeone.site/",
    ic = class {
      authToken
      projectId
      cached = null
      constructor(r, e) {
        ;((this.authToken = r), (this.projectId = e))
      }
      async getCredential() {
        if (this.cached && !this.isExpired(this.cached)) return this.cached
        let r = await this.fetchCredential()
        return ((this.cached = r), r)
      }
      clearCache() {
        this.cached = null
      }
      isExpired(r) {
        let e = Math.floor(Date.now() / 1e3)
        return r.expiredTime - e < Sf
      }
      async fetchCredential() {
        for (let r = 1; r <= 3; r++) {
          let e = new AbortController(),
            t = setTimeout(() => e.abort(), 1e4),
            i
          try {
            i = await Sn(Pf, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.authToken}`,
                "X-Env": kf(),
              },
              body: JSON.stringify(
                this.projectId ? { ProjectId: this.projectId } : {},
              ),
              signal: e.signal,
            })
          } catch (o) {
            if (r < 3) {
              await vn(500 * r)
              continue
            }
            throw new dt(
              `failed to obtain STS credential: ${o.message || "timeout"}`,
            )
          } finally {
            clearTimeout(t)
          }
          if (i.status === 413) throw new dt("storage quota exceeded")
          if (i.status === 429) throw new dt("rate limited, please retry later")
          if (!i.ok) {
            if (i.status >= 500 && r < 3) {
              await vn(500 * r)
              continue
            }
            let o = await i.text().catch(() => "unknown error")
            throw new dt(`failed to obtain STS credential: ${i.status} ${o}`)
          }
          let s = await i.json(),
            n = s.data && typeof s.data == "object" ? s.data : s
          if (
            n.tmpSecretId &&
            n.tmpSecretKey &&
            n.sessionToken &&
            n.expiredTime
          ) {
            let o = n.cosMainland,
              a = n.cosOverseas,
              c = i.headers.get("X-Edge-Region") || void 0
            return {
              tmpSecretId: n.tmpSecretId,
              tmpSecretKey: n.tmpSecretKey,
              sessionToken: n.sessionToken,
              expiredTime: n.expiredTime,
              appId: n.appId || void 0,
              zoneId: n.zoneId || void 0,
              projectId: n.projectId || void 0,
              resourcePrefix: n.resourcePrefix || void 0,
              cosMainland: o || void 0,
              cosOverseas: a || void 0,
              edgeRegion: c,
            }
          }
          if (n.code !== void 0 && n.code !== 0) {
            let o = n.msg || n.message || "unknown error"
            throw new dt(`credential exchange failed (code=${n.code}): ${o}`)
          }
          if (s.code !== void 0 && s.code !== 0) {
            let o = s.msg || s.message || "unknown error"
            throw new dt(`credential exchange failed (code=${s.code}): ${o}`)
          }
          if (r < 3) {
            await vn(500 * r)
            continue
          }
          throw new dt("invalid STS credential response")
        }
        throw new dt("invalid STS credential response")
      }
    }
  function vn(r) {
    return new Promise((e) => setTimeout(e, r))
  }
  var Af = "{{PAGES_BLOB_DEPLOY_CREDENTIAL}}"
  function Cf() {
    let r = {},
      e = Ef()
    if (e) r.deployCredential = e
    else {
      let i = Va("PAGES_BLOB_DEPLOY_CREDENTIAL")
      i && (r.deployCredential = i)
    }
    let t = Va("PAGES_PROJECT_ID")
    return (t && (r.projectId = t), r)
  }
  function Ef() {
    let r = Af
    if (!(r.startsWith("{{") && r.endsWith("}}"))) return r || void 0
  }
  function Va(r) {
    if (typeof process < "u" && process.env) return process.env[r]
  }
  function Df(r) {
    let e = typeof r == "string" ? r : r.name
    uf(e)
    let t = sc(typeof r == "string" ? void 0 : r),
      i = new ic(t.authToken, t.projectId),
      s = new rc(i)
    return new Xa(s, e, t.consistency ?? "eventual")
  }
  async function Ff(r) {
    let e = sc(
        r
          ? {
              name: "__list__",
              projectId: r.projectId,
              token: r.token,
              consistency: r.consistency,
            }
          : void 0,
      ),
      t = new ic(e.authToken, e.projectId)
    return {
      stores: (await new rc(t).listStores(e.consistency)).map((i) => ({
        name: i,
      })),
    }
  }
  function sc(r) {
    let e = Cf(),
      t = r?.token || e.deployCredential,
      i = r?.projectId || e.projectId
    if (r?.token || e.projectId) {
      if (!i) throw new Qa()
      if (!t) throw new xn(["token"])
      return { authToken: t, projectId: i, consistency: r?.consistency }
    }
    if (r?.projectId && !t) throw new xn(["token"])
    if (!e.deployCredential) throw new xn(["deployCredential"])
    return { authToken: e.deployCredential, consistency: r?.consistency }
  }
})
var Dn = {}
jt(Dn, {
  defaultDb: () => vr,
  getDb: () => U,
  getKvBinding: () => gi,
  getKvStatus: () => En,
  getMetas: () => Of,
  getPlugins: () => $f,
  getSettings: () => Rf,
  getStorages: () => qf,
  getUsers: () => Uf,
  resolvePath: () => ne,
  saveDb: () => $,
  setEnvCtx: () => Cn,
})
async function Tf() {
  if (ac) return ui
  ac = !0
  try {
    let { getStore: r } = await Promise.resolve().then(() => lr(oc(), 1))
    ui = r({ name: "openlistnext_db", consistency: "strong" })
  } catch {
    ui = null
  }
  return ui
}
function dc() {
  cc ||
    ((cc = !0),
    !(typeof process > "u" || typeof process.on != "function") &&
      process.on("uncaughtException", (r) => {
        ;(r?.message?.includes("RESP") ||
          r?.message?.includes("Unknown type") ||
          r?.stack?.includes("processResponses")) &&
          console.error(
            "[KV/RESP] Caught uncaught exception from storage binding, continuing:",
            r.message,
          )
      }))
}
function Cn(r) {
  r && (_r = r)
}
async function gi(r) {
  r && (_r = r)
  let e = r || _r || (typeof process < "u" ? process.env : {}),
    t = typeof globalThis < "u" ? globalThis : {}
  try {
    let c = await Tf()
    if (c)
      return (
        dc(),
        {
          binding: c,
          platform: "EdgeOne Blob (@edgeone/pages-blob, strong consistency)",
          mode: "blob",
        }
      )
  } catch {}
  let i =
      (e && (e.EDGEONE_KV_NAME || e.KV_NAMESPACE || e.KV_NAME)) ||
      t.EDGEONE_KV_NAME ||
      t.KV_NAMESPACE,
    s = [
      ...(i ? [{ key: i, name: i }] : []),
      { key: "EDGEONE_KV", name: "EDGEONE_KV" },
      { key: "EO_KV", name: "EO_KV" },
      { key: "OPENLISTNEXT_KV", name: "OPENLISTNEXT_KV" },
      { key: "OPENLISTNEXT_KV_ID", name: "OPENLISTNEXT_KV_ID" },
      { key: "KV", name: "KV" },
      { key: "CF_KV", name: "CF_KV" },
      { key: "DATABASE_KV", name: "DATABASE_KV" },
    ]
  for (let c of s) {
    let d = (e && e[c.key]) || t[c.key]
    if (
      d &&
      typeof d.get == "function" &&
      (typeof d.put == "function" || typeof d.set == "function")
    ) {
      let l =
        c.key.startsWith("EDGEONE") ||
        c.key.startsWith("EO") ||
        !!(e && (e.EDGEONE || e.EO_REGION || e.EDGEONE_KV_NAME)) ||
        !!(t.EDGEONE_KV || t.EO_KV)
      l && dc()
      let u = l
        ? `EdgeOne KV (${c.name})`
        : `Cloudflare / EdgeOne KV (${c.name})`
      return { binding: d, platform: u, mode: "binding" }
    }
  }
  let n =
      e.CF_ACCOUNT_ID ||
      (typeof process < "u" ? process.env.CF_ACCOUNT_ID : ""),
    o =
      e.CF_KV_NAMESPACE_ID ||
      (typeof process < "u" ? process.env.CF_KV_NAMESPACE_ID : ""),
    a = e.CF_API_TOKEN || (typeof process < "u" ? process.env.CF_API_TOKEN : "")
  return n && o && a
    ? {
        binding: { type: "cf_rest", accountId: n, namespaceId: o, token: a },
        platform: "Cloudflare KV (REST API)",
        mode: "api",
      }
    : { binding: null, platform: "Memory", mode: "none" }
}
async function lc(r, e = "openlistnext_config") {
  let { binding: t, mode: i } = r
  if (i === "none" || !t) return null
  try {
    if (i === "blob") {
      let s = await t.get(e, { type: "json" })
      if (s) return s
      let n = await t.get(e)
      if (n) return typeof n == "string" ? JSON.parse(n) : n
    } else if (i === "binding") {
      let s = null
      try {
        s = await t.get(e, "text")
      } catch {
        s = await t.get(e)
      }
      if ((s == null && (s = await t.get(e)), s))
        return typeof s == "string" ? JSON.parse(s) : s
    } else if (t.type === "cf_rest") {
      let s = `https://api.cloudflare.com/client/v4/accounts/${t.accountId}/storage/kv/namespaces/${t.namespaceId}/values/${e}`,
        n = await fetch(s, { headers: { Authorization: `Bearer ${t.token}` } })
      if (n.ok) {
        let o = await n.text()
        return JSON.parse(o)
      }
    }
  } catch (s) {
    console.error("[KV/Blob Store] Error reading key:", e, s)
  }
  return null
}
async function If(r, e, t) {
  let { binding: i, mode: s } = r
  if (s === "none" || !i) return !1
  let n = JSON.stringify(t)
  try {
    if (s === "blob") {
      if (typeof i.setJSON == "function") return (await i.setJSON(e, t), !0)
      if (typeof i.set == "function") return (await i.set(e, n), !0)
    } else if (s === "binding") {
      if (typeof i.put == "function") return (await i.put(e, n), !0)
      if (typeof i.set == "function") return (await i.set(e, n), !0)
    } else if (i.type === "cf_rest") {
      let o = `https://api.cloudflare.com/client/v4/accounts/${i.accountId}/storage/kv/namespaces/${i.namespaceId}/values/${e}`
      return (
        await fetch(o, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${i.token}`,
            "Content-Type": "text/plain",
          },
          body: n,
        })
      ).ok
    }
  } catch (o) {
    console.error("[KV/Blob Store] Error writing key:", e, o)
  }
  return !1
}
async function En(r) {
  let e = await gi(r),
    t = e.mode !== "none",
    i = !1,
    s = null
  if (t)
    try {
      let n = await lc(e, "openlistnext_config")
      return (
        (i = !0),
        {
          configured: !0,
          connected: !0,
          platform: e.platform,
          mode: e.mode,
          hasData: !!n,
          error: null,
        }
      )
    } catch (n) {
      s = n.message || String(n)
    }
  return {
    configured: t,
    connected: i,
    platform: e.platform,
    mode: e.mode,
    hasData: !1,
    error: s,
  }
}
async function ne(r) {
  let e = await U(),
    t = []
  for (let a of String(r || "").split("/"))
    if (!(a === "" || a === ".")) {
      if (a === "..") {
        t.pop()
        continue
      }
      t.push(a)
    }
  let i = "/" + t.join("/")
  i === "" && (i = "/")
  let s = (e.storages || []).filter(
    (a) =>
      !a.disabled &&
      typeof a.driver == "string" &&
      a.driver.trim() !== "" &&
      a.driver !== "undefined" &&
      a.driver !== "null" &&
      typeof a.mount_path == "string" &&
      a.mount_path.trim() !== "",
  )
  if (s.length === 0)
    throw new Error(
      "failed get storage: storage not found; please add a storage first",
    )
  let n = [...s].sort((a, c) => {
    let d = "/" + (a.mount_path || "").split("/").filter(Boolean).join("/")
    return (
      ("/" + (c.mount_path || "").split("/").filter(Boolean).join("/")).length -
      d.length
    )
  })
  for (let a of n) {
    let c = "/" + (a.mount_path || "").split("/").filter(Boolean).join("/"),
      d = c === "/"
    if (d || i === c || i.startsWith(c + "/")) {
      let u = i
      ;(d || (u = i.slice(c.length)), u.startsWith("/") || (u = "/" + u))
      let f = {}
      try {
        f =
          typeof a.addition == "string"
            ? JSON.parse(a.addition || "{}")
            : a.addition || {}
      } catch {
        f = {}
      }
      let h = f.root_folder_path !== void 0 ? f.root_folder_path : "/",
        w = (
          [h, u]
            .map((g) => g.replace(/\\/g, "/"))
            .filter((g) => !!g && g !== "/")
            .join("/") || "/"
        ).replace(/\/{2,}/g, "/")
      return {
        storage: a,
        relative: u,
        physical: w,
        rootFolder: h,
        cleanPath: i,
        isVirtual: !1,
      }
    }
  }
  let o = !1
  for (let a of s) {
    let c = "/" + (a.mount_path || "").split("/").filter(Boolean).join("/")
    if (c !== "/" && c.startsWith(i === "/" ? "/" : i + "/")) {
      o = !0
      break
    }
  }
  if (o)
    return {
      storage: null,
      relative: i,
      physical: null,
      rootFolder: null,
      cleanPath: i,
      isVirtual: !0,
    }
  throw new Error("failed get storage: storage not found")
}
async function Rf() {
  let r = await U(),
    e = {}
  return (
    r.settings &&
      r.settings.forEach((t) => {
        e[t.key] = t.value
      }),
    e
  )
}
async function Uf() {
  return (await U()).users || []
}
async function qf() {
  return (await U()).storages || []
}
async function Of() {
  return (await U()).metas || []
}
async function $f() {
  return (await U()).plugins || []
}
var vr,
  X,
  _r,
  ui,
  ac,
  cc,
  Bf,
  An,
  fi,
  pi,
  hi,
  U,
  $,
  te = N(() => {
    "use strict"
    ;((vr = {
      settings: [
        {
          key: "version",
          value: "v4.2.3",
          type: "string",
          help: "Application Version",
          group: 1,
          flag: 1,
        },
        {
          key: "site_title",
          value: "OpenListNext",
          type: "string",
          help: "Site Title",
          group: 1,
          flag: 0,
        },
        {
          key: "announcement",
          value: "",
          type: "text",
          help: "Site Announcement",
          group: 1,
          flag: 0,
        },
        {
          key: "pagination_type",
          value: "pagination",
          type: "select",
          options: "all,pagination,load_more,auto_load_more",
          help: "Pagination Type",
          group: 1,
          flag: 0,
        },
        {
          key: "default_page_size",
          value: "20",
          type: "number",
          help: "Default Page Size",
          group: 1,
          flag: 0,
        },
        {
          key: "allow_indexed",
          value: "false",
          type: "bool",
          help: "Allow Search Engine Indexing",
          group: 1,
          flag: 0,
        },
        {
          key: "allow_mounted",
          value: "true",
          type: "bool",
          help: "Allow Mounted Storages",
          group: 1,
          flag: 0,
        },
        {
          key: "robots_txt",
          value: `User-agent: *
Disallow: /`,
          type: "text",
          help: "Robots Txt Content",
          group: 1,
          flag: 0,
        },
        {
          key: "logo",
          value: "/logo.png",
          type: "string",
          help: "Site Logo URL",
          group: 2,
          flag: 0,
        },
        {
          key: "favicon",
          value: "/favicon.png",
          type: "string",
          help: "Favicon URL",
          group: 2,
          flag: 0,
        },
        {
          key: "main_color",
          value: "#1890ff",
          type: "string",
          help: "Main Theme Color",
          group: 2,
          flag: 0,
        },
        {
          key: "home_icon",
          value: "openlistnext",
          type: "string",
          help: "Home Icon Name",
          group: 2,
          flag: 0,
        },
        {
          key: "home_container",
          value: "max_980px",
          type: "select",
          options: "max_980px,hope_container",
          help: "Home Container Width",
          group: 2,
          flag: 0,
        },
        {
          key: "settings_layout",
          value: "responsive",
          type: "select",
          options: "list,responsive",
          help: "Settings Layout Mode",
          group: 2,
          flag: 0,
        },
        {
          key: "text_types",
          value:
            "txt,htm,html,xml,java,properties,sql,js,json,c,cpp,python,py,php,go,rst,css,typescript,ts,log,conf,yaml,yml,cmd,bash,sh,vue,ini",
          type: "text",
          help: "Text File Extensions",
          group: 3,
          flag: 0,
        },
        {
          key: "audio_types",
          value: "mp3,ogg,aac,wav,wma,flac,m4a,opus",
          type: "text",
          help: "Audio File Extensions",
          group: 3,
          flag: 0,
        },
        {
          key: "video_types",
          value: "mp4,mkv,webm,avi,mov,flv,m3u8,ts",
          type: "text",
          help: "Video File Extensions",
          group: 3,
          flag: 0,
        },
        {
          key: "image_types",
          value: "jpg,png,jpeg,gif,bmp,svg,ico,webp,avif,tiff",
          type: "text",
          help: "Image File Extensions",
          group: 3,
          flag: 0,
        },
        {
          key: "proxy_types",
          value: "",
          type: "text",
          help: "Proxy File Extensions",
          group: 3,
          flag: 0,
        },
        {
          key: "proxy_ignore_headers",
          value: "",
          type: "text",
          help: "Proxy Ignore Headers",
          group: 3,
          flag: 0,
        },
        {
          key: "external_previews",
          value: "{}",
          type: "text",
          help: "External Previews JSON Config",
          group: 3,
          flag: 0,
        },
        {
          key: "iframe_previews",
          value: "{}",
          type: "text",
          help: "Iframe Previews JSON Config",
          group: 3,
          flag: 0,
        },
        {
          key: "audio_cover",
          value: "https://file.nn.ci/alist/cover.png",
          type: "string",
          help: "Audio Default Cover Image URL",
          group: 3,
          flag: 0,
        },
        {
          key: "audio_autoplay",
          value: "false",
          type: "bool",
          help: "Autoplay Audio",
          group: 3,
          flag: 0,
        },
        {
          key: "video_autoplay",
          value: "false",
          type: "bool",
          help: "Autoplay Video",
          group: 3,
          flag: 0,
        },
        {
          key: "preview_archives_by_default",
          value: "false",
          type: "bool",
          help: "Preview Archives By Default",
          group: 3,
          flag: 0,
        },
        {
          key: "readme_autorender",
          value: "true",
          type: "bool",
          help: "Readme Autorender",
          group: 3,
          flag: 0,
        },
        {
          key: "filter_readme_scripts",
          value: "true",
          type: "bool",
          help: "Filter Readme Scripts",
          group: 3,
          flag: 0,
        },
        {
          key: "force_preview",
          value: "",
          type: "text",
          help: "Force Preview Config",
          group: 3,
          flag: 0,
        },
        {
          key: "specify_preview",
          value: "",
          type: "text",
          help: "Specify Preview Layout Config",
          group: 3,
          flag: 0,
        },
        {
          key: "markdown_autorender",
          value: "true",
          type: "bool",
          help: "Autorender Markdown",
          group: 3,
          flag: 0,
        },
        {
          key: "code_editor_theme",
          value: "vs-dark",
          type: "select",
          options: "vs,vs-dark,hc-black",
          help: "Monaco Theme",
          group: 3,
          flag: 0,
        },
        {
          key: "office_preview",
          value: "true",
          type: "bool",
          help: "Enable Office Document Preview",
          group: 3,
          flag: 0,
        },
        {
          key: "pdf_preview",
          value: "true",
          type: "bool",
          help: "Enable PDF Preview",
          group: 3,
          flag: 0,
        },
        {
          key: "hide_files",
          value: "",
          type: "text",
          help: "Files Regex to Hide",
          group: 4,
          flag: 0,
        },
        {
          key: "package_download",
          value: "true",
          type: "bool",
          help: "Package Download Enabled",
          group: 4,
          flag: 0,
        },
        {
          key: "customize_head",
          value: "",
          type: "text",
          help: "Custom Head HTML/CSS",
          group: 4,
          flag: 0,
        },
        {
          key: "customize_body",
          value: "",
          type: "text",
          help: "Custom Body Script",
          group: 4,
          flag: 0,
        },
        {
          key: "link_expiration",
          value: "0",
          type: "number",
          help: "Link Expiration in Seconds",
          group: 4,
          flag: 0,
        },
        {
          key: "sign_all",
          value: "false",
          type: "bool",
          help: "Sign All Download Links",
          group: 4,
          flag: 0,
        },
        {
          key: "privacy_regs",
          value: "",
          type: "text",
          help: "Privacy Regex Rules",
          group: 4,
          flag: 0,
        },
        {
          key: "ocr_api",
          value: "",
          type: "string",
          help: "OCR API Endpoint",
          group: 4,
          flag: 0,
        },
        {
          key: "filename_char_mapping",
          value: "{}",
          type: "text",
          help: "Filename Char Mapping JSON",
          group: 4,
          flag: 0,
        },
        {
          key: "forward_direct_link_params",
          value: "",
          type: "string",
          help: "Forward Direct Link Params",
          group: 4,
          flag: 0,
        },
        {
          key: "ignore_direct_link_params",
          value: "",
          type: "string",
          help: "Ignore Direct Link Params",
          group: 4,
          flag: 0,
        },
        {
          key: "webauthn_login_enabled",
          value: "false",
          type: "bool",
          help: "Webauthn Login Enabled",
          group: 4,
          flag: 0,
        },
        {
          key: "allow_previewing_sharing_files",
          value: "true",
          type: "bool",
          help: "Allow Previewing Sharing Files",
          group: 4,
          flag: 0,
        },
        {
          key: "allow_previewing_sharing_archives",
          value: "true",
          type: "bool",
          help: "Allow Previewing Sharing Archives",
          group: 4,
          flag: 0,
        },
        {
          key: "force_proxy_sharing_files",
          value: "false",
          type: "bool",
          help: "Force Proxy Sharing Files",
          group: 4,
          flag: 0,
        },
        {
          key: "share_summary_content",
          value: "",
          type: "text",
          help: "Share Summary Content",
          group: 4,
          flag: 0,
        },
        {
          key: "handle_hook_after_writing",
          value: "",
          type: "string",
          help: "Handle Hook After Writing",
          group: 4,
          flag: 0,
        },
        {
          key: "handle_hook_rate_limit",
          value: "0",
          type: "number",
          help: "Handle Hook Rate Limit",
          group: 4,
          flag: 0,
        },
        {
          key: "ignore_system_files",
          value: "true",
          type: "bool",
          help: "Ignore System Files (.DS_Store, desktop.ini, etc.)",
          group: 4,
          flag: 0,
        },
        {
          key: "auto_update_index",
          value: "false",
          type: "bool",
          help: "Auto Update Search Index",
          group: 4,
          flag: 0,
        },
        {
          key: "sso_client_id",
          value: "",
          type: "string",
          help: "SSO Client ID",
          group: 7,
          flag: 0,
        },
        {
          key: "sso_client_secret",
          value: "",
          type: "string",
          help: "SSO Client Secret",
          group: 7,
          flag: 0,
        },
        {
          key: "sso_login_url",
          value: "",
          type: "string",
          help: "SSO Authorization Endpoint",
          group: 7,
          flag: 0,
        },
        {
          key: "ldap_host",
          value: "",
          type: "string",
          help: "LDAP Server Host",
          group: 8,
          flag: 0,
        },
        {
          key: "ldap_port",
          value: "389",
          type: "number",
          help: "LDAP Server Port",
          group: 8,
          flag: 0,
        },
        {
          key: "traffic_limit",
          value: "0",
          type: "number",
          help: "Traffic Limit in MB",
          group: 10,
          flag: 0,
        },
        {
          key: "ip_limit",
          value: "0",
          type: "number",
          help: "IP Rate Limit Per Minute",
          group: 10,
          flag: 0,
        },
        {
          key: "115_temp_dir",
          value: "",
          type: "string",
          help: "115 Temp Directory",
          group: 14,
          flag: 0,
        },
        {
          key: "115_open_temp_dir",
          value: "",
          type: "string",
          help: "115 Open Temp Directory",
          group: 14,
          flag: 0,
        },
        {
          key: "123_temp_dir",
          value: "",
          type: "string",
          help: "123 Pan Temp Directory",
          group: 14,
          flag: 0,
        },
        {
          key: "123_open_temp_dir",
          value: "",
          type: "string",
          help: "123 Open Temp Directory",
          group: 14,
          flag: 0,
        },
        {
          key: "123_open_callback_url",
          value: "",
          type: "string",
          help: "123 Open Callback URL",
          group: 14,
          flag: 0,
        },
        {
          key: "pikpak_temp_dir",
          value: "",
          type: "string",
          help: "PikPak Temp Directory",
          group: 14,
          flag: 0,
        },
        {
          key: "thunder_temp_dir",
          value: "",
          type: "string",
          help: "Thunder Temp Directory",
          group: 14,
          flag: 0,
        },
        {
          key: "thunder_browser_temp_dir",
          value: "",
          type: "string",
          help: "Thunder Browser Temp Directory",
          group: 14,
          flag: 0,
        },
        {
          key: "thunderx_temp_dir",
          value: "",
          type: "string",
          help: "ThunderX Temp Directory",
          group: 14,
          flag: 0,
        },
        {
          key: "token",
          value: "",
          type: "string",
          help: "115 / PikPak / Thunder Token",
          group: 14,
          flag: 0,
        },
        {
          key: "package_download_disabled",
          value: "false",
          type: "bool",
          help: "Disable Package Download",
          group: 14,
          flag: 0,
        },
      ],
      storages: [],
      users: [
        {
          id: 1,
          username: "admin",
          password: "",
          role: 2,
          permission: 0,
          base_path: "/",
          disabled: !1,
          sso_id: "",
          allow_ldap: !1,
          pwd_update_at: new Date().toISOString(),
        },
        {
          id: 2,
          username: "guest",
          password: "",
          role: 1,
          permission: 0,
          base_path: "/",
          disabled: !1,
          sso_id: "",
          allow_ldap: !1,
          pwd_update_at: new Date().toISOString(),
        },
      ],
      metas: [],
      shares: [],
      plugins: [],
    }),
      (X = null),
      (_r = null),
      (ui = null),
      (ac = !1))
    cc = !1
    ;((Bf = {
      logo: {
        from: ["", "https://res.oplist.org/logo/logo.png"],
        to: "/logo.png",
      },
      favicon: {
        from: ["", "https://res.oplist.org/logo/logo.svg"],
        to: "/favicon.png",
      },
      site_title: { from: ["OpenList"], to: "OpenListNext" },
      home_icon: { from: ["openlist", "oplist"], to: "openlistnext" },
      home_container: { from: ["hope_container"], to: "max_980px" },
    }),
      (An = (r) => {
        if (!r) return
        r.settings || (r.settings = [])
        let e = !1,
          t = [],
          i = new Set()
        for (let s of vr.settings) {
          i.add(s.key)
          let n = r.settings.filter((o) => o.key === s.key)
          if (n.length === 0) (t.push(JSON.parse(JSON.stringify(s))), (e = !0))
          else {
            let o = n.find((c) => c.value && c.value.trim() !== "") || n[0]
            ;((o.group !== s.group ||
              o.help !== s.help ||
              o.type !== s.type ||
              o.options !== s.options ||
              o.flag !== s.flag) &&
              ((o.group = s.group),
              (o.help = s.help),
              (o.type = s.type),
              (o.options = s.options),
              (o.flag = s.flag),
              (e = !0)),
              n.length > 1 && (e = !0))
            let a = Bf[s.key]
            ;(a && a.from.includes(o.value) && ((o.value = a.to), (e = !0)),
              t.push(o))
          }
        }
        for (let s of r.settings)
          s.key && !i.has(s.key) && (i.add(s.key), t.push(s))
        ;(e || t.length !== r.settings.length) &&
          ((r.settings = t), $(r).catch(() => {}))
      }),
      (fi = (r) => {
        r &&
          (!r.storages || !Array.isArray(r.storages)
            ? (r.storages = [])
            : (r.storages = r.storages.filter(
                (e) =>
                  e &&
                  typeof e == "object" &&
                  typeof e.driver == "string" &&
                  e.driver.trim() !== "" &&
                  e.driver !== "undefined" &&
                  e.driver !== "null" &&
                  typeof e.mount_path == "string" &&
                  e.mount_path.trim() !== "",
              )))
      }),
      (pi = (r) => {
        r && (r.shares || (r.shares = []))
      }),
      (hi = (r) => {
        r && (r.plugins || (r.plugins = []))
      }),
      (U = async (r) => {
        r && (_r = r)
        let e = await gi(r)
        if (e.mode !== "none")
          try {
            let t = await lc(e, "openlistnext_config")
            if (t) return ((X = t), An(X), fi(X), pi(X), hi(X), X)
          } catch (t) {
            console.error("[DB] Error reading config from KV:", t)
          }
        if (X) return (An(X), fi(X), pi(X), hi(X), X)
        if (typeof process < "u" && process.env && process.env.DATABASE_JSON)
          try {
            return (
              (X = JSON.parse(process.env.DATABASE_JSON)),
              An(X),
              fi(X),
              pi(X),
              hi(X),
              X
            )
          } catch (t) {
            console.error("Failed to parse DATABASE_JSON env variable:", t)
          }
        return ((X = JSON.parse(JSON.stringify(vr))), fi(X), pi(X), hi(X), X)
      }),
      ($ = async (r, e) => {
        ;(e && (_r = e), (X = r))
        let t = await gi(e)
        t.mode !== "none"
          ? (await If(t, "openlistnext_config", r).catch(
              (s) => (console.error("[DB] Failed to save to KV:", s), !1),
            )) &&
            console.log(
              `[DB] Successfully persisted ${r.storages?.length || 0} storages to KV (${t.platform})`,
            )
          : console.warn(
              "[DB] WARNING: No KV binding found! Storage configuration changes will exist only in memory!",
            )
      }))
  })
function L(r, e) {
  if (e) return 1
  let t = (r.split(".").pop() || "").toLowerCase()
  return [
    "mp4",
    "mkv",
    "avi",
    "mov",
    "flv",
    "wmv",
    "ts",
    "m2ts",
    "m4v",
    "rmvb",
    "webm",
    "3gp",
    "asf",
    "vob",
    "ogv",
    "rm",
    "f4v",
  ].includes(t)
    ? 2
    : [
          "mp3",
          "flac",
          "aac",
          "wav",
          "ogg",
          "m4a",
          "opus",
          "wma",
          "ape",
          "alac",
          "aiff",
          "mid",
          "midi",
        ].includes(t)
      ? 3
      : [
            "txt",
            "md",
            "markdown",
            "json",
            "js",
            "ts",
            "jsx",
            "tsx",
            "css",
            "scss",
            "html",
            "htm",
            "xml",
            "yaml",
            "yml",
            "ini",
            "conf",
            "env",
            "log",
            "sql",
            "py",
            "java",
            "c",
            "cpp",
            "h",
            "hpp",
            "go",
            "rs",
            "sh",
            "bat",
            "cmd",
            "ps1",
            "php",
            "rb",
            "swift",
            "kt",
            "cs",
            "vue",
            "svelte",
            "json5",
            "toml",
          ].includes(t)
        ? 4
        : [
              "jpg",
              "jpeg",
              "png",
              "gif",
              "bmp",
              "webp",
              "svg",
              "ico",
              "tiff",
              "tif",
              "heic",
              "heif",
              "avif",
              "vvc",
              "avc",
              "psd",
              "ai",
            ].includes(t)
          ? 5
          : 0
}
var fe = N(() => {
  "use strict"
})
function Rn(r) {
  return Array.from(new Uint8Array(r))
    .map((e) => e.toString(16).padStart(2, "0"))
    .join("")
}
function kr(r) {
  return typeof r == "string" ? new TextEncoder().encode(r) : r
}
function fp(r) {
  let e = typeof r == "string" ? new TextEncoder().encode(r) : r,
    t = e.length,
    i = t * 8,
    s = (56 - ((t + 1) % 64) + 64) % 64,
    n = new Uint8Array(t + 1 + s + 8)
  ;(n.set(e), (n[t] = 128))
  let o = new DataView(n.buffer)
  ;(o.setUint32(n.length - 8, i >>> 0, !0),
    o.setUint32(n.length - 4, Math.floor(i / 4294967296), !0))
  let a = new Int32Array(64)
  for (let h = 0; h < 64; h++)
    a[h] = (Math.abs(Math.sin(h + 1)) * 4294967296) | 0
  let c = [
      7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20,
      5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4,
      11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6,
      10, 15, 21,
    ],
    d = 1732584193,
    l = 4023233417,
    u = 2562383102,
    f = 271733878
  for (let h = 0; h < n.length; h += 64) {
    let m = new DataView(n.buffer, h, 64),
      w = Array.from({ length: 16 }, (_, b) => m.getInt32(b * 4, !0)),
      [g, y, v, x] = [d, l, u, f]
    for (let _ = 0; _ < 64; _++) {
      let b, S
      _ < 16
        ? ((b = (y & v) | (~y & x)), (S = _))
        : _ < 32
          ? ((b = (x & y) | (~x & v)), (S = (5 * _ + 1) % 16))
          : _ < 48
            ? ((b = y ^ v ^ x), (S = (3 * _ + 5) % 16))
            : ((b = v ^ (y | ~x)), (S = (7 * _) % 16))
      let A = x
      ;((x = v), (v = y))
      let C = (g + b + a[_] + w[S]) | 0
      ;((y = (y + ((C << c[_]) | (C >>> (32 - c[_])))) | 0), (g = A))
    }
    ;((d = (d + g) | 0),
      (l = (l + y) | 0),
      (u = (u + v) | 0),
      (f = (f + x) | 0))
  }
  let p = new DataView(new ArrayBuffer(16))
  return (
    p.setInt32(0, d, !0),
    p.setInt32(4, l, !0),
    p.setInt32(8, u, !0),
    p.setInt32(12, f, !0),
    Rn(p.buffer)
  )
}
function Ai(r) {
  return fp(r)
}
async function Ci(r) {
  let e = await crypto.subtle.digest("SHA-1", kr(r))
  return Rn(e)
}
async function Un(r, e) {
  let t = await crypto.subtle.importKey(
      "raw",
      kr(e),
      { name: "HMAC", hash: "SHA-256" },
      !1,
      ["sign"],
    ),
    i = await crypto.subtle.sign("HMAC", t, kr(r))
  return Rn(i)
}
async function Fc(r, e) {
  let t = await crypto.subtle.importKey(
      "raw",
      kr(e),
      { name: "HMAC", hash: "SHA-1" },
      !1,
      ["sign"],
    ),
    i = await crypto.subtle.sign("HMAC", t, kr(r)),
    s = new Uint8Array(i),
    n = ""
  for (let o of s) n += String.fromCharCode(o)
  return btoa(n)
}
var Sr = N(() => {
  "use strict"
})
var K = H((Ui, jc) => {
  ;(function (r, e) {
    typeof Ui == "object"
      ? (jc.exports = Ui = e())
      : typeof define == "function" && define.amd
        ? define([], e)
        : (r.CryptoJS = e())
  })(Ui, function () {
    var r =
      r ||
      (function (e, t) {
        var i
        if (
          (typeof window < "u" && window.crypto && (i = window.crypto),
          typeof self < "u" && self.crypto && (i = self.crypto),
          typeof globalThis < "u" &&
            globalThis.crypto &&
            (i = globalThis.crypto),
          !i && typeof window < "u" && window.msCrypto && (i = window.msCrypto),
          !i && typeof global < "u" && global.crypto && (i = global.crypto),
          !i && typeof dr == "function")
        )
          try {
            i = dr("crypto")
          } catch {}
        var s = function () {
            if (i) {
              if (typeof i.getRandomValues == "function")
                try {
                  return i.getRandomValues(new Uint32Array(1))[0]
                } catch {}
              if (typeof i.randomBytes == "function")
                try {
                  return i.randomBytes(4).readInt32LE()
                } catch {}
            }
            throw new Error(
              "Native crypto module could not be used to get secure random number.",
            )
          },
          n =
            Object.create ||
            (function () {
              function g() {}
              return function (y) {
                var v
                return (
                  (g.prototype = y),
                  (v = new g()),
                  (g.prototype = null),
                  v
                )
              }
            })(),
          o = {},
          a = (o.lib = {}),
          c = (a.Base = (function () {
            return {
              extend: function (g) {
                var y = n(this)
                return (
                  g && y.mixIn(g),
                  (!y.hasOwnProperty("init") || this.init === y.init) &&
                    (y.init = function () {
                      y.$super.init.apply(this, arguments)
                    }),
                  (y.init.prototype = y),
                  (y.$super = this),
                  y
                )
              },
              create: function () {
                var g = this.extend()
                return (g.init.apply(g, arguments), g)
              },
              init: function () {},
              mixIn: function (g) {
                for (var y in g) g.hasOwnProperty(y) && (this[y] = g[y])
                g.hasOwnProperty("toString") && (this.toString = g.toString)
              },
              clone: function () {
                return this.init.prototype.extend(this)
              },
            }
          })()),
          d = (a.WordArray = c.extend({
            init: function (g, y) {
              ;((g = this.words = g || []),
                y != t ? (this.sigBytes = y) : (this.sigBytes = g.length * 4))
            },
            toString: function (g) {
              return (g || u).stringify(this)
            },
            concat: function (g) {
              var y = this.words,
                v = g.words,
                x = this.sigBytes,
                _ = g.sigBytes
              if ((this.clamp(), x % 4))
                for (var b = 0; b < _; b++) {
                  var S = (v[b >>> 2] >>> (24 - (b % 4) * 8)) & 255
                  y[(x + b) >>> 2] |= S << (24 - ((x + b) % 4) * 8)
                }
              else for (var A = 0; A < _; A += 4) y[(x + A) >>> 2] = v[A >>> 2]
              return ((this.sigBytes += _), this)
            },
            clamp: function () {
              var g = this.words,
                y = this.sigBytes
              ;((g[y >>> 2] &= 4294967295 << (32 - (y % 4) * 8)),
                (g.length = e.ceil(y / 4)))
            },
            clone: function () {
              var g = c.clone.call(this)
              return ((g.words = this.words.slice(0)), g)
            },
            random: function (g) {
              for (var y = [], v = 0; v < g; v += 4) y.push(s())
              return new d.init(y, g)
            },
          })),
          l = (o.enc = {}),
          u = (l.Hex = {
            stringify: function (g) {
              for (var y = g.words, v = g.sigBytes, x = [], _ = 0; _ < v; _++) {
                var b = (y[_ >>> 2] >>> (24 - (_ % 4) * 8)) & 255
                ;(x.push((b >>> 4).toString(16)), x.push((b & 15).toString(16)))
              }
              return x.join("")
            },
            parse: function (g) {
              for (var y = g.length, v = [], x = 0; x < y; x += 2)
                v[x >>> 3] |= parseInt(g.substr(x, 2), 16) << (24 - (x % 8) * 4)
              return new d.init(v, y / 2)
            },
          }),
          f = (l.Latin1 = {
            stringify: function (g) {
              for (var y = g.words, v = g.sigBytes, x = [], _ = 0; _ < v; _++) {
                var b = (y[_ >>> 2] >>> (24 - (_ % 4) * 8)) & 255
                x.push(String.fromCharCode(b))
              }
              return x.join("")
            },
            parse: function (g) {
              for (var y = g.length, v = [], x = 0; x < y; x++)
                v[x >>> 2] |= (g.charCodeAt(x) & 255) << (24 - (x % 4) * 8)
              return new d.init(v, y)
            },
          }),
          p = (l.Utf8 = {
            stringify: function (g) {
              try {
                return decodeURIComponent(escape(f.stringify(g)))
              } catch {
                throw new Error("Malformed UTF-8 data")
              }
            },
            parse: function (g) {
              return f.parse(unescape(encodeURIComponent(g)))
            },
          }),
          h = (a.BufferedBlockAlgorithm = c.extend({
            reset: function () {
              ;((this._data = new d.init()), (this._nDataBytes = 0))
            },
            _append: function (g) {
              ;(typeof g == "string" && (g = p.parse(g)),
                this._data.concat(g),
                (this._nDataBytes += g.sigBytes))
            },
            _process: function (g) {
              var y,
                v = this._data,
                x = v.words,
                _ = v.sigBytes,
                b = this.blockSize,
                S = b * 4,
                A = _ / S
              g
                ? (A = e.ceil(A))
                : (A = e.max((A | 0) - this._minBufferSize, 0))
              var C = A * b,
                P = e.min(C * 4, _)
              if (C) {
                for (var k = 0; k < C; k += b) this._doProcessBlock(x, k)
                ;((y = x.splice(0, C)), (v.sigBytes -= P))
              }
              return new d.init(y, P)
            },
            clone: function () {
              var g = c.clone.call(this)
              return ((g._data = this._data.clone()), g)
            },
            _minBufferSize: 0,
          })),
          m = (a.Hasher = h.extend({
            cfg: c.extend(),
            init: function (g) {
              ;((this.cfg = this.cfg.extend(g)), this.reset())
            },
            reset: function () {
              ;(h.reset.call(this), this._doReset())
            },
            update: function (g) {
              return (this._append(g), this._process(), this)
            },
            finalize: function (g) {
              g && this._append(g)
              var y = this._doFinalize()
              return y
            },
            blockSize: 512 / 32,
            _createHelper: function (g) {
              return function (y, v) {
                return new g.init(v).finalize(y)
              }
            },
            _createHmacHelper: function (g) {
              return function (y, v) {
                return new w.HMAC.init(g, v).finalize(y)
              }
            },
          })),
          w = (o.algo = {})
        return o
      })(Math)
    return r
  })
})
var Er = H((qi, zc) => {
  ;(function (r, e) {
    typeof qi == "object"
      ? (zc.exports = qi = e(K()))
      : typeof define == "function" && define.amd
        ? define(["./core"], e)
        : e(r.CryptoJS)
  })(qi, function (r) {
    return (
      (function (e) {
        var t = r,
          i = t.lib,
          s = i.Base,
          n = i.WordArray,
          o = (t.x64 = {}),
          a = (o.Word = s.extend({
            init: function (d, l) {
              ;((this.high = d), (this.low = l))
            },
          })),
          c = (o.WordArray = s.extend({
            init: function (d, l) {
              ;((d = this.words = d || []),
                l != e ? (this.sigBytes = l) : (this.sigBytes = d.length * 8))
            },
            toX32: function () {
              for (
                var d = this.words, l = d.length, u = [], f = 0;
                f < l;
                f++
              ) {
                var p = d[f]
                ;(u.push(p.high), u.push(p.low))
              }
              return n.create(u, this.sigBytes)
            },
            clone: function () {
              for (
                var d = s.clone.call(this),
                  l = (d.words = this.words.slice(0)),
                  u = l.length,
                  f = 0;
                f < u;
                f++
              )
                l[f] = l[f].clone()
              return d
            },
          }))
      })(),
      r
    )
  })
})
var Nc = H((Oi, Lc) => {
  ;(function (r, e) {
    typeof Oi == "object"
      ? (Lc.exports = Oi = e(K()))
      : typeof define == "function" && define.amd
        ? define(["./core"], e)
        : e(r.CryptoJS)
  })(Oi, function (r) {
    return (
      (function () {
        if (typeof ArrayBuffer == "function") {
          var e = r,
            t = e.lib,
            i = t.WordArray,
            s = i.init,
            n = (i.init = function (o) {
              if (
                (o instanceof ArrayBuffer && (o = new Uint8Array(o)),
                (o instanceof Int8Array ||
                  (typeof Uint8ClampedArray < "u" &&
                    o instanceof Uint8ClampedArray) ||
                  o instanceof Int16Array ||
                  o instanceof Uint16Array ||
                  o instanceof Int32Array ||
                  o instanceof Uint32Array ||
                  o instanceof Float32Array ||
                  o instanceof Float64Array) &&
                  (o = new Uint8Array(o.buffer, o.byteOffset, o.byteLength)),
                o instanceof Uint8Array)
              ) {
                for (var a = o.byteLength, c = [], d = 0; d < a; d++)
                  c[d >>> 2] |= o[d] << (24 - (d % 4) * 8)
                s.call(this, c, a)
              } else s.apply(this, arguments)
            })
          n.prototype = i
        }
      })(),
      r.lib.WordArray
    )
  })
})
var Hc = H(($i, Mc) => {
  ;(function (r, e) {
    typeof $i == "object"
      ? (Mc.exports = $i = e(K()))
      : typeof define == "function" && define.amd
        ? define(["./core"], e)
        : e(r.CryptoJS)
  })($i, function (r) {
    return (
      (function () {
        var e = r,
          t = e.lib,
          i = t.WordArray,
          s = e.enc,
          n =
            (s.Utf16 =
            s.Utf16BE =
              {
                stringify: function (a) {
                  for (
                    var c = a.words, d = a.sigBytes, l = [], u = 0;
                    u < d;
                    u += 2
                  ) {
                    var f = (c[u >>> 2] >>> (16 - (u % 4) * 8)) & 65535
                    l.push(String.fromCharCode(f))
                  }
                  return l.join("")
                },
                parse: function (a) {
                  for (var c = a.length, d = [], l = 0; l < c; l++)
                    d[l >>> 1] |= a.charCodeAt(l) << (16 - (l % 2) * 16)
                  return i.create(d, c * 2)
                },
              })
        s.Utf16LE = {
          stringify: function (a) {
            for (
              var c = a.words, d = a.sigBytes, l = [], u = 0;
              u < d;
              u += 2
            ) {
              var f = o((c[u >>> 2] >>> (16 - (u % 4) * 8)) & 65535)
              l.push(String.fromCharCode(f))
            }
            return l.join("")
          },
          parse: function (a) {
            for (var c = a.length, d = [], l = 0; l < c; l++)
              d[l >>> 1] |= o(a.charCodeAt(l) << (16 - (l % 2) * 16))
            return i.create(d, c * 2)
          },
        }
        function o(a) {
          return ((a << 8) & 4278255360) | ((a >>> 8) & 16711935)
        }
      })(),
      r.enc.Utf16
    )
  })
})
var ut = H((ji, Kc) => {
  ;(function (r, e) {
    typeof ji == "object"
      ? (Kc.exports = ji = e(K()))
      : typeof define == "function" && define.amd
        ? define(["./core"], e)
        : e(r.CryptoJS)
  })(ji, function (r) {
    return (
      (function () {
        var e = r,
          t = e.lib,
          i = t.WordArray,
          s = e.enc,
          n = (s.Base64 = {
            stringify: function (a) {
              var c = a.words,
                d = a.sigBytes,
                l = this._map
              a.clamp()
              for (var u = [], f = 0; f < d; f += 3)
                for (
                  var p = (c[f >>> 2] >>> (24 - (f % 4) * 8)) & 255,
                    h = (c[(f + 1) >>> 2] >>> (24 - ((f + 1) % 4) * 8)) & 255,
                    m = (c[(f + 2) >>> 2] >>> (24 - ((f + 2) % 4) * 8)) & 255,
                    w = (p << 16) | (h << 8) | m,
                    g = 0;
                  g < 4 && f + g * 0.75 < d;
                  g++
                )
                  u.push(l.charAt((w >>> (6 * (3 - g))) & 63))
              var y = l.charAt(64)
              if (y) for (; u.length % 4; ) u.push(y)
              return u.join("")
            },
            parse: function (a) {
              var c = a.length,
                d = this._map,
                l = this._reverseMap
              if (!l) {
                l = this._reverseMap = []
                for (var u = 0; u < d.length; u++) l[d.charCodeAt(u)] = u
              }
              var f = d.charAt(64)
              if (f) {
                var p = a.indexOf(f)
                p !== -1 && (c = p)
              }
              return o(a, c, l)
            },
            _map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
          })
        function o(a, c, d) {
          for (var l = [], u = 0, f = 0; f < c; f++)
            if (f % 4) {
              var p = d[a.charCodeAt(f - 1)] << ((f % 4) * 2),
                h = d[a.charCodeAt(f)] >>> (6 - (f % 4) * 2),
                m = p | h
              ;((l[u >>> 2] |= m << (24 - (u % 4) * 8)), u++)
            }
          return i.create(l, u)
        }
      })(),
      r.enc.Base64
    )
  })
})
var Gc = H((zi, Wc) => {
  ;(function (r, e) {
    typeof zi == "object"
      ? (Wc.exports = zi = e(K()))
      : typeof define == "function" && define.amd
        ? define(["./core"], e)
        : e(r.CryptoJS)
  })(zi, function (r) {
    return (
      (function () {
        var e = r,
          t = e.lib,
          i = t.WordArray,
          s = e.enc,
          n = (s.Base64url = {
            stringify: function (a, c) {
              c === void 0 && (c = !0)
              var d = a.words,
                l = a.sigBytes,
                u = c ? this._safe_map : this._map
              a.clamp()
              for (var f = [], p = 0; p < l; p += 3)
                for (
                  var h = (d[p >>> 2] >>> (24 - (p % 4) * 8)) & 255,
                    m = (d[(p + 1) >>> 2] >>> (24 - ((p + 1) % 4) * 8)) & 255,
                    w = (d[(p + 2) >>> 2] >>> (24 - ((p + 2) % 4) * 8)) & 255,
                    g = (h << 16) | (m << 8) | w,
                    y = 0;
                  y < 4 && p + y * 0.75 < l;
                  y++
                )
                  f.push(u.charAt((g >>> (6 * (3 - y))) & 63))
              var v = u.charAt(64)
              if (v) for (; f.length % 4; ) f.push(v)
              return f.join("")
            },
            parse: function (a, c) {
              c === void 0 && (c = !0)
              var d = a.length,
                l = c ? this._safe_map : this._map,
                u = this._reverseMap
              if (!u) {
                u = this._reverseMap = []
                for (var f = 0; f < l.length; f++) u[l.charCodeAt(f)] = f
              }
              var p = l.charAt(64)
              if (p) {
                var h = a.indexOf(p)
                h !== -1 && (d = h)
              }
              return o(a, d, u)
            },
            _map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
            _safe_map:
              "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
          })
        function o(a, c, d) {
          for (var l = [], u = 0, f = 0; f < c; f++)
            if (f % 4) {
              var p = d[a.charCodeAt(f - 1)] << ((f % 4) * 2),
                h = d[a.charCodeAt(f)] >>> (6 - (f % 4) * 2),
                m = p | h
              ;((l[u >>> 2] |= m << (24 - (u % 4) * 8)), u++)
            }
          return i.create(l, u)
        }
      })(),
      r.enc.Base64url
    )
  })
})
var ft = H((Li, Vc) => {
  ;(function (r, e) {
    typeof Li == "object"
      ? (Vc.exports = Li = e(K()))
      : typeof define == "function" && define.amd
        ? define(["./core"], e)
        : e(r.CryptoJS)
  })(Li, function (r) {
    return (
      (function (e) {
        var t = r,
          i = t.lib,
          s = i.WordArray,
          n = i.Hasher,
          o = t.algo,
          a = []
        ;(function () {
          for (var p = 0; p < 64; p++)
            a[p] = (e.abs(e.sin(p + 1)) * 4294967296) | 0
        })()
        var c = (o.MD5 = n.extend({
          _doReset: function () {
            this._hash = new s.init([
              1732584193, 4023233417, 2562383102, 271733878,
            ])
          },
          _doProcessBlock: function (p, h) {
            for (var m = 0; m < 16; m++) {
              var w = h + m,
                g = p[w]
              p[w] =
                (((g << 8) | (g >>> 24)) & 16711935) |
                (((g << 24) | (g >>> 8)) & 4278255360)
            }
            var y = this._hash.words,
              v = p[h + 0],
              x = p[h + 1],
              _ = p[h + 2],
              b = p[h + 3],
              S = p[h + 4],
              A = p[h + 5],
              C = p[h + 6],
              P = p[h + 7],
              k = p[h + 8],
              D = p[h + 9],
              T = p[h + 10],
              E = p[h + 11],
              O = p[h + 12],
              q = p[h + 13],
              j = p[h + 14],
              W = p[h + 15],
              F = y[0],
              B = y[1],
              R = y[2],
              I = y[3]
            ;((F = d(F, B, R, I, v, 7, a[0])),
              (I = d(I, F, B, R, x, 12, a[1])),
              (R = d(R, I, F, B, _, 17, a[2])),
              (B = d(B, R, I, F, b, 22, a[3])),
              (F = d(F, B, R, I, S, 7, a[4])),
              (I = d(I, F, B, R, A, 12, a[5])),
              (R = d(R, I, F, B, C, 17, a[6])),
              (B = d(B, R, I, F, P, 22, a[7])),
              (F = d(F, B, R, I, k, 7, a[8])),
              (I = d(I, F, B, R, D, 12, a[9])),
              (R = d(R, I, F, B, T, 17, a[10])),
              (B = d(B, R, I, F, E, 22, a[11])),
              (F = d(F, B, R, I, O, 7, a[12])),
              (I = d(I, F, B, R, q, 12, a[13])),
              (R = d(R, I, F, B, j, 17, a[14])),
              (B = d(B, R, I, F, W, 22, a[15])),
              (F = l(F, B, R, I, x, 5, a[16])),
              (I = l(I, F, B, R, C, 9, a[17])),
              (R = l(R, I, F, B, E, 14, a[18])),
              (B = l(B, R, I, F, v, 20, a[19])),
              (F = l(F, B, R, I, A, 5, a[20])),
              (I = l(I, F, B, R, T, 9, a[21])),
              (R = l(R, I, F, B, W, 14, a[22])),
              (B = l(B, R, I, F, S, 20, a[23])),
              (F = l(F, B, R, I, D, 5, a[24])),
              (I = l(I, F, B, R, j, 9, a[25])),
              (R = l(R, I, F, B, b, 14, a[26])),
              (B = l(B, R, I, F, k, 20, a[27])),
              (F = l(F, B, R, I, q, 5, a[28])),
              (I = l(I, F, B, R, _, 9, a[29])),
              (R = l(R, I, F, B, P, 14, a[30])),
              (B = l(B, R, I, F, O, 20, a[31])),
              (F = u(F, B, R, I, A, 4, a[32])),
              (I = u(I, F, B, R, k, 11, a[33])),
              (R = u(R, I, F, B, E, 16, a[34])),
              (B = u(B, R, I, F, j, 23, a[35])),
              (F = u(F, B, R, I, x, 4, a[36])),
              (I = u(I, F, B, R, S, 11, a[37])),
              (R = u(R, I, F, B, P, 16, a[38])),
              (B = u(B, R, I, F, T, 23, a[39])),
              (F = u(F, B, R, I, q, 4, a[40])),
              (I = u(I, F, B, R, v, 11, a[41])),
              (R = u(R, I, F, B, b, 16, a[42])),
              (B = u(B, R, I, F, C, 23, a[43])),
              (F = u(F, B, R, I, D, 4, a[44])),
              (I = u(I, F, B, R, O, 11, a[45])),
              (R = u(R, I, F, B, W, 16, a[46])),
              (B = u(B, R, I, F, _, 23, a[47])),
              (F = f(F, B, R, I, v, 6, a[48])),
              (I = f(I, F, B, R, P, 10, a[49])),
              (R = f(R, I, F, B, j, 15, a[50])),
              (B = f(B, R, I, F, A, 21, a[51])),
              (F = f(F, B, R, I, O, 6, a[52])),
              (I = f(I, F, B, R, b, 10, a[53])),
              (R = f(R, I, F, B, T, 15, a[54])),
              (B = f(B, R, I, F, x, 21, a[55])),
              (F = f(F, B, R, I, k, 6, a[56])),
              (I = f(I, F, B, R, W, 10, a[57])),
              (R = f(R, I, F, B, C, 15, a[58])),
              (B = f(B, R, I, F, q, 21, a[59])),
              (F = f(F, B, R, I, S, 6, a[60])),
              (I = f(I, F, B, R, E, 10, a[61])),
              (R = f(R, I, F, B, _, 15, a[62])),
              (B = f(B, R, I, F, D, 21, a[63])),
              (y[0] = (y[0] + F) | 0),
              (y[1] = (y[1] + B) | 0),
              (y[2] = (y[2] + R) | 0),
              (y[3] = (y[3] + I) | 0))
          },
          _doFinalize: function () {
            var p = this._data,
              h = p.words,
              m = this._nDataBytes * 8,
              w = p.sigBytes * 8
            h[w >>> 5] |= 128 << (24 - (w % 32))
            var g = e.floor(m / 4294967296),
              y = m
            ;((h[(((w + 64) >>> 9) << 4) + 15] =
              (((g << 8) | (g >>> 24)) & 16711935) |
              (((g << 24) | (g >>> 8)) & 4278255360)),
              (h[(((w + 64) >>> 9) << 4) + 14] =
                (((y << 8) | (y >>> 24)) & 16711935) |
                (((y << 24) | (y >>> 8)) & 4278255360)),
              (p.sigBytes = (h.length + 1) * 4),
              this._process())
            for (var v = this._hash, x = v.words, _ = 0; _ < 4; _++) {
              var b = x[_]
              x[_] =
                (((b << 8) | (b >>> 24)) & 16711935) |
                (((b << 24) | (b >>> 8)) & 4278255360)
            }
            return v
          },
          clone: function () {
            var p = n.clone.call(this)
            return ((p._hash = this._hash.clone()), p)
          },
        }))
        function d(p, h, m, w, g, y, v) {
          var x = p + ((h & m) | (~h & w)) + g + v
          return ((x << y) | (x >>> (32 - y))) + h
        }
        function l(p, h, m, w, g, y, v) {
          var x = p + ((h & w) | (m & ~w)) + g + v
          return ((x << y) | (x >>> (32 - y))) + h
        }
        function u(p, h, m, w, g, y, v) {
          var x = p + (h ^ m ^ w) + g + v
          return ((x << y) | (x >>> (32 - y))) + h
        }
        function f(p, h, m, w, g, y, v) {
          var x = p + (m ^ (h | ~w)) + g + v
          return ((x << y) | (x >>> (32 - y))) + h
        }
        ;((t.MD5 = n._createHelper(c)), (t.HmacMD5 = n._createHmacHelper(c)))
      })(Math),
      r.MD5
    )
  })
})
var Ln = H((Ni, Jc) => {
  ;(function (r, e) {
    typeof Ni == "object"
      ? (Jc.exports = Ni = e(K()))
      : typeof define == "function" && define.amd
        ? define(["./core"], e)
        : e(r.CryptoJS)
  })(Ni, function (r) {
    return (
      (function () {
        var e = r,
          t = e.lib,
          i = t.WordArray,
          s = t.Hasher,
          n = e.algo,
          o = [],
          a = (n.SHA1 = s.extend({
            _doReset: function () {
              this._hash = new i.init([
                1732584193, 4023233417, 2562383102, 271733878, 3285377520,
              ])
            },
            _doProcessBlock: function (c, d) {
              for (
                var l = this._hash.words,
                  u = l[0],
                  f = l[1],
                  p = l[2],
                  h = l[3],
                  m = l[4],
                  w = 0;
                w < 80;
                w++
              ) {
                if (w < 16) o[w] = c[d + w] | 0
                else {
                  var g = o[w - 3] ^ o[w - 8] ^ o[w - 14] ^ o[w - 16]
                  o[w] = (g << 1) | (g >>> 31)
                }
                var y = ((u << 5) | (u >>> 27)) + m + o[w]
                ;(w < 20
                  ? (y += ((f & p) | (~f & h)) + 1518500249)
                  : w < 40
                    ? (y += (f ^ p ^ h) + 1859775393)
                    : w < 60
                      ? (y += ((f & p) | (f & h) | (p & h)) - 1894007588)
                      : (y += (f ^ p ^ h) - 899497514),
                  (m = h),
                  (h = p),
                  (p = (f << 30) | (f >>> 2)),
                  (f = u),
                  (u = y))
              }
              ;((l[0] = (l[0] + u) | 0),
                (l[1] = (l[1] + f) | 0),
                (l[2] = (l[2] + p) | 0),
                (l[3] = (l[3] + h) | 0),
                (l[4] = (l[4] + m) | 0))
            },
            _doFinalize: function () {
              var c = this._data,
                d = c.words,
                l = this._nDataBytes * 8,
                u = c.sigBytes * 8
              return (
                (d[u >>> 5] |= 128 << (24 - (u % 32))),
                (d[(((u + 64) >>> 9) << 4) + 14] = Math.floor(l / 4294967296)),
                (d[(((u + 64) >>> 9) << 4) + 15] = l),
                (c.sigBytes = d.length * 4),
                this._process(),
                this._hash
              )
            },
            clone: function () {
              var c = s.clone.call(this)
              return ((c._hash = this._hash.clone()), c)
            },
          }))
        ;((e.SHA1 = s._createHelper(a)), (e.HmacSHA1 = s._createHmacHelper(a)))
      })(),
      r.SHA1
    )
  })
})
var Hi = H((Mi, Qc) => {
  ;(function (r, e) {
    typeof Mi == "object"
      ? (Qc.exports = Mi = e(K()))
      : typeof define == "function" && define.amd
        ? define(["./core"], e)
        : e(r.CryptoJS)
  })(Mi, function (r) {
    return (
      (function (e) {
        var t = r,
          i = t.lib,
          s = i.WordArray,
          n = i.Hasher,
          o = t.algo,
          a = [],
          c = []
        ;(function () {
          function u(m) {
            for (var w = e.sqrt(m), g = 2; g <= w; g++) if (!(m % g)) return !1
            return !0
          }
          function f(m) {
            return ((m - (m | 0)) * 4294967296) | 0
          }
          for (var p = 2, h = 0; h < 64; )
            (u(p) &&
              (h < 8 && (a[h] = f(e.pow(p, 1 / 2))),
              (c[h] = f(e.pow(p, 1 / 3))),
              h++),
              p++)
        })()
        var d = [],
          l = (o.SHA256 = n.extend({
            _doReset: function () {
              this._hash = new s.init(a.slice(0))
            },
            _doProcessBlock: function (u, f) {
              for (
                var p = this._hash.words,
                  h = p[0],
                  m = p[1],
                  w = p[2],
                  g = p[3],
                  y = p[4],
                  v = p[5],
                  x = p[6],
                  _ = p[7],
                  b = 0;
                b < 64;
                b++
              ) {
                if (b < 16) d[b] = u[f + b] | 0
                else {
                  var S = d[b - 15],
                    A =
                      ((S << 25) | (S >>> 7)) ^
                      ((S << 14) | (S >>> 18)) ^
                      (S >>> 3),
                    C = d[b - 2],
                    P =
                      ((C << 15) | (C >>> 17)) ^
                      ((C << 13) | (C >>> 19)) ^
                      (C >>> 10)
                  d[b] = A + d[b - 7] + P + d[b - 16]
                }
                var k = (y & v) ^ (~y & x),
                  D = (h & m) ^ (h & w) ^ (m & w),
                  T =
                    ((h << 30) | (h >>> 2)) ^
                    ((h << 19) | (h >>> 13)) ^
                    ((h << 10) | (h >>> 22)),
                  E =
                    ((y << 26) | (y >>> 6)) ^
                    ((y << 21) | (y >>> 11)) ^
                    ((y << 7) | (y >>> 25)),
                  O = _ + E + k + c[b] + d[b],
                  q = T + D
                ;((_ = x),
                  (x = v),
                  (v = y),
                  (y = (g + O) | 0),
                  (g = w),
                  (w = m),
                  (m = h),
                  (h = (O + q) | 0))
              }
              ;((p[0] = (p[0] + h) | 0),
                (p[1] = (p[1] + m) | 0),
                (p[2] = (p[2] + w) | 0),
                (p[3] = (p[3] + g) | 0),
                (p[4] = (p[4] + y) | 0),
                (p[5] = (p[5] + v) | 0),
                (p[6] = (p[6] + x) | 0),
                (p[7] = (p[7] + _) | 0))
            },
            _doFinalize: function () {
              var u = this._data,
                f = u.words,
                p = this._nDataBytes * 8,
                h = u.sigBytes * 8
              return (
                (f[h >>> 5] |= 128 << (24 - (h % 32))),
                (f[(((h + 64) >>> 9) << 4) + 14] = e.floor(p / 4294967296)),
                (f[(((h + 64) >>> 9) << 4) + 15] = p),
                (u.sigBytes = f.length * 4),
                this._process(),
                this._hash
              )
            },
            clone: function () {
              var u = n.clone.call(this)
              return ((u._hash = this._hash.clone()), u)
            },
          }))
        ;((t.SHA256 = n._createHelper(l)),
          (t.HmacSHA256 = n._createHmacHelper(l)))
      })(Math),
      r.SHA256
    )
  })
})
var Yc = H((Ki, Xc) => {
  ;(function (r, e, t) {
    typeof Ki == "object"
      ? (Xc.exports = Ki = e(K(), Hi()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./sha256"], e)
        : e(r.CryptoJS)
  })(Ki, function (r) {
    return (
      (function () {
        var e = r,
          t = e.lib,
          i = t.WordArray,
          s = e.algo,
          n = s.SHA256,
          o = (s.SHA224 = n.extend({
            _doReset: function () {
              this._hash = new i.init([
                3238371032, 914150663, 812702999, 4144912697, 4290775857,
                1750603025, 1694076839, 3204075428,
              ])
            },
            _doFinalize: function () {
              var a = n._doFinalize.call(this)
              return ((a.sigBytes -= 4), a)
            },
          }))
        ;((e.SHA224 = n._createHelper(o)),
          (e.HmacSHA224 = n._createHmacHelper(o)))
      })(),
      r.SHA224
    )
  })
})
var Nn = H((Wi, Zc) => {
  ;(function (r, e, t) {
    typeof Wi == "object"
      ? (Zc.exports = Wi = e(K(), Er()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./x64-core"], e)
        : e(r.CryptoJS)
  })(Wi, function (r) {
    return (
      (function () {
        var e = r,
          t = e.lib,
          i = t.Hasher,
          s = e.x64,
          n = s.Word,
          o = s.WordArray,
          a = e.algo
        function c() {
          return n.create.apply(n, arguments)
        }
        var d = [
            c(1116352408, 3609767458),
            c(1899447441, 602891725),
            c(3049323471, 3964484399),
            c(3921009573, 2173295548),
            c(961987163, 4081628472),
            c(1508970993, 3053834265),
            c(2453635748, 2937671579),
            c(2870763221, 3664609560),
            c(3624381080, 2734883394),
            c(310598401, 1164996542),
            c(607225278, 1323610764),
            c(1426881987, 3590304994),
            c(1925078388, 4068182383),
            c(2162078206, 991336113),
            c(2614888103, 633803317),
            c(3248222580, 3479774868),
            c(3835390401, 2666613458),
            c(4022224774, 944711139),
            c(264347078, 2341262773),
            c(604807628, 2007800933),
            c(770255983, 1495990901),
            c(1249150122, 1856431235),
            c(1555081692, 3175218132),
            c(1996064986, 2198950837),
            c(2554220882, 3999719339),
            c(2821834349, 766784016),
            c(2952996808, 2566594879),
            c(3210313671, 3203337956),
            c(3336571891, 1034457026),
            c(3584528711, 2466948901),
            c(113926993, 3758326383),
            c(338241895, 168717936),
            c(666307205, 1188179964),
            c(773529912, 1546045734),
            c(1294757372, 1522805485),
            c(1396182291, 2643833823),
            c(1695183700, 2343527390),
            c(1986661051, 1014477480),
            c(2177026350, 1206759142),
            c(2456956037, 344077627),
            c(2730485921, 1290863460),
            c(2820302411, 3158454273),
            c(3259730800, 3505952657),
            c(3345764771, 106217008),
            c(3516065817, 3606008344),
            c(3600352804, 1432725776),
            c(4094571909, 1467031594),
            c(275423344, 851169720),
            c(430227734, 3100823752),
            c(506948616, 1363258195),
            c(659060556, 3750685593),
            c(883997877, 3785050280),
            c(958139571, 3318307427),
            c(1322822218, 3812723403),
            c(1537002063, 2003034995),
            c(1747873779, 3602036899),
            c(1955562222, 1575990012),
            c(2024104815, 1125592928),
            c(2227730452, 2716904306),
            c(2361852424, 442776044),
            c(2428436474, 593698344),
            c(2756734187, 3733110249),
            c(3204031479, 2999351573),
            c(3329325298, 3815920427),
            c(3391569614, 3928383900),
            c(3515267271, 566280711),
            c(3940187606, 3454069534),
            c(4118630271, 4000239992),
            c(116418474, 1914138554),
            c(174292421, 2731055270),
            c(289380356, 3203993006),
            c(460393269, 320620315),
            c(685471733, 587496836),
            c(852142971, 1086792851),
            c(1017036298, 365543100),
            c(1126000580, 2618297676),
            c(1288033470, 3409855158),
            c(1501505948, 4234509866),
            c(1607167915, 987167468),
            c(1816402316, 1246189591),
          ],
          l = []
        ;(function () {
          for (var f = 0; f < 80; f++) l[f] = c()
        })()
        var u = (a.SHA512 = i.extend({
          _doReset: function () {
            this._hash = new o.init([
              new n.init(1779033703, 4089235720),
              new n.init(3144134277, 2227873595),
              new n.init(1013904242, 4271175723),
              new n.init(2773480762, 1595750129),
              new n.init(1359893119, 2917565137),
              new n.init(2600822924, 725511199),
              new n.init(528734635, 4215389547),
              new n.init(1541459225, 327033209),
            ])
          },
          _doProcessBlock: function (f, p) {
            for (
              var h = this._hash.words,
                m = h[0],
                w = h[1],
                g = h[2],
                y = h[3],
                v = h[4],
                x = h[5],
                _ = h[6],
                b = h[7],
                S = m.high,
                A = m.low,
                C = w.high,
                P = w.low,
                k = g.high,
                D = g.low,
                T = y.high,
                E = y.low,
                O = v.high,
                q = v.low,
                j = x.high,
                W = x.low,
                F = _.high,
                B = _.low,
                R = b.high,
                I = b.low,
                Q = S,
                V = A,
                _e = C,
                M = P,
                rr = k,
                qt = D,
                rn = T,
                ir = E,
                Re = O,
                Pe = q,
                Jr = j,
                sr = W,
                Qr = F,
                nr = B,
                sn = R,
                or = I,
                Ue = 0;
              Ue < 80;
              Ue++
            ) {
              var Te,
                nt,
                Xr = l[Ue]
              if (Ue < 16)
                ((nt = Xr.high = f[p + Ue * 2] | 0),
                  (Te = Xr.low = f[p + Ue * 2 + 1] | 0))
              else {
                var Xo = l[Ue - 15],
                  Ot = Xo.high,
                  ar = Xo.low,
                  S0 =
                    ((Ot >>> 1) | (ar << 31)) ^
                    ((Ot >>> 8) | (ar << 24)) ^
                    (Ot >>> 7),
                  Yo =
                    ((ar >>> 1) | (Ot << 31)) ^
                    ((ar >>> 8) | (Ot << 24)) ^
                    ((ar >>> 7) | (Ot << 25)),
                  Zo = l[Ue - 2],
                  $t = Zo.high,
                  cr = Zo.low,
                  P0 =
                    (($t >>> 19) | (cr << 13)) ^
                    (($t << 3) | (cr >>> 29)) ^
                    ($t >>> 6),
                  ea =
                    ((cr >>> 19) | ($t << 13)) ^
                    ((cr << 3) | ($t >>> 29)) ^
                    ((cr >>> 6) | ($t << 26)),
                  ta = l[Ue - 7],
                  A0 = ta.high,
                  C0 = ta.low,
                  ra = l[Ue - 16],
                  E0 = ra.high,
                  ia = ra.low
                ;((Te = Yo + C0),
                  (nt = S0 + A0 + (Te >>> 0 < Yo >>> 0 ? 1 : 0)),
                  (Te = Te + ea),
                  (nt = nt + P0 + (Te >>> 0 < ea >>> 0 ? 1 : 0)),
                  (Te = Te + ia),
                  (nt = nt + E0 + (Te >>> 0 < ia >>> 0 ? 1 : 0)),
                  (Xr.high = nt),
                  (Xr.low = Te))
              }
              var D0 = (Re & Jr) ^ (~Re & Qr),
                sa = (Pe & sr) ^ (~Pe & nr),
                F0 = (Q & _e) ^ (Q & rr) ^ (_e & rr),
                T0 = (V & M) ^ (V & qt) ^ (M & qt),
                I0 =
                  ((Q >>> 28) | (V << 4)) ^
                  ((Q << 30) | (V >>> 2)) ^
                  ((Q << 25) | (V >>> 7)),
                na =
                  ((V >>> 28) | (Q << 4)) ^
                  ((V << 30) | (Q >>> 2)) ^
                  ((V << 25) | (Q >>> 7)),
                B0 =
                  ((Re >>> 14) | (Pe << 18)) ^
                  ((Re >>> 18) | (Pe << 14)) ^
                  ((Re << 23) | (Pe >>> 9)),
                R0 =
                  ((Pe >>> 14) | (Re << 18)) ^
                  ((Pe >>> 18) | (Re << 14)) ^
                  ((Pe << 23) | (Re >>> 9)),
                oa = d[Ue],
                U0 = oa.high,
                aa = oa.low,
                Ae = or + R0,
                ot = sn + B0 + (Ae >>> 0 < or >>> 0 ? 1 : 0),
                Ae = Ae + sa,
                ot = ot + D0 + (Ae >>> 0 < sa >>> 0 ? 1 : 0),
                Ae = Ae + aa,
                ot = ot + U0 + (Ae >>> 0 < aa >>> 0 ? 1 : 0),
                Ae = Ae + Te,
                ot = ot + nt + (Ae >>> 0 < Te >>> 0 ? 1 : 0),
                ca = na + T0,
                q0 = I0 + F0 + (ca >>> 0 < na >>> 0 ? 1 : 0)
              ;((sn = Qr),
                (or = nr),
                (Qr = Jr),
                (nr = sr),
                (Jr = Re),
                (sr = Pe),
                (Pe = (ir + Ae) | 0),
                (Re = (rn + ot + (Pe >>> 0 < ir >>> 0 ? 1 : 0)) | 0),
                (rn = rr),
                (ir = qt),
                (rr = _e),
                (qt = M),
                (_e = Q),
                (M = V),
                (V = (Ae + ca) | 0),
                (Q = (ot + q0 + (V >>> 0 < Ae >>> 0 ? 1 : 0)) | 0))
            }
            ;((A = m.low = A + V),
              (m.high = S + Q + (A >>> 0 < V >>> 0 ? 1 : 0)),
              (P = w.low = P + M),
              (w.high = C + _e + (P >>> 0 < M >>> 0 ? 1 : 0)),
              (D = g.low = D + qt),
              (g.high = k + rr + (D >>> 0 < qt >>> 0 ? 1 : 0)),
              (E = y.low = E + ir),
              (y.high = T + rn + (E >>> 0 < ir >>> 0 ? 1 : 0)),
              (q = v.low = q + Pe),
              (v.high = O + Re + (q >>> 0 < Pe >>> 0 ? 1 : 0)),
              (W = x.low = W + sr),
              (x.high = j + Jr + (W >>> 0 < sr >>> 0 ? 1 : 0)),
              (B = _.low = B + nr),
              (_.high = F + Qr + (B >>> 0 < nr >>> 0 ? 1 : 0)),
              (I = b.low = I + or),
              (b.high = R + sn + (I >>> 0 < or >>> 0 ? 1 : 0)))
          },
          _doFinalize: function () {
            var f = this._data,
              p = f.words,
              h = this._nDataBytes * 8,
              m = f.sigBytes * 8
            ;((p[m >>> 5] |= 128 << (24 - (m % 32))),
              (p[(((m + 128) >>> 10) << 5) + 30] = Math.floor(h / 4294967296)),
              (p[(((m + 128) >>> 10) << 5) + 31] = h),
              (f.sigBytes = p.length * 4),
              this._process())
            var w = this._hash.toX32()
            return w
          },
          clone: function () {
            var f = i.clone.call(this)
            return ((f._hash = this._hash.clone()), f)
          },
          blockSize: 1024 / 32,
        }))
        ;((e.SHA512 = i._createHelper(u)),
          (e.HmacSHA512 = i._createHmacHelper(u)))
      })(),
      r.SHA512
    )
  })
})
var td = H((Gi, ed) => {
  ;(function (r, e, t) {
    typeof Gi == "object"
      ? (ed.exports = Gi = e(K(), Er(), Nn()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./x64-core", "./sha512"], e)
        : e(r.CryptoJS)
  })(Gi, function (r) {
    return (
      (function () {
        var e = r,
          t = e.x64,
          i = t.Word,
          s = t.WordArray,
          n = e.algo,
          o = n.SHA512,
          a = (n.SHA384 = o.extend({
            _doReset: function () {
              this._hash = new s.init([
                new i.init(3418070365, 3238371032),
                new i.init(1654270250, 914150663),
                new i.init(2438529370, 812702999),
                new i.init(355462360, 4144912697),
                new i.init(1731405415, 4290775857),
                new i.init(2394180231, 1750603025),
                new i.init(3675008525, 1694076839),
                new i.init(1203062813, 3204075428),
              ])
            },
            _doFinalize: function () {
              var c = o._doFinalize.call(this)
              return ((c.sigBytes -= 16), c)
            },
          }))
        ;((e.SHA384 = o._createHelper(a)),
          (e.HmacSHA384 = o._createHmacHelper(a)))
      })(),
      r.SHA384
    )
  })
})
var id = H((Vi, rd) => {
  ;(function (r, e, t) {
    typeof Vi == "object"
      ? (rd.exports = Vi = e(K(), Er()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./x64-core"], e)
        : e(r.CryptoJS)
  })(Vi, function (r) {
    return (
      (function (e) {
        var t = r,
          i = t.lib,
          s = i.WordArray,
          n = i.Hasher,
          o = t.x64,
          a = o.Word,
          c = t.algo,
          d = [],
          l = [],
          u = []
        ;(function () {
          for (var h = 1, m = 0, w = 0; w < 24; w++) {
            d[h + 5 * m] = (((w + 1) * (w + 2)) / 2) % 64
            var g = m % 5,
              y = (2 * h + 3 * m) % 5
            ;((h = g), (m = y))
          }
          for (var h = 0; h < 5; h++)
            for (var m = 0; m < 5; m++)
              l[h + 5 * m] = m + ((2 * h + 3 * m) % 5) * 5
          for (var v = 1, x = 0; x < 24; x++) {
            for (var _ = 0, b = 0, S = 0; S < 7; S++) {
              if (v & 1) {
                var A = (1 << S) - 1
                A < 32 ? (b ^= 1 << A) : (_ ^= 1 << (A - 32))
              }
              v & 128 ? (v = (v << 1) ^ 113) : (v <<= 1)
            }
            u[x] = a.create(_, b)
          }
        })()
        var f = []
        ;(function () {
          for (var h = 0; h < 25; h++) f[h] = a.create()
        })()
        var p = (c.SHA3 = n.extend({
          cfg: n.cfg.extend({ outputLength: 512 }),
          _doReset: function () {
            for (var h = (this._state = []), m = 0; m < 25; m++)
              h[m] = new a.init()
            this.blockSize = (1600 - 2 * this.cfg.outputLength) / 32
          },
          _doProcessBlock: function (h, m) {
            for (
              var w = this._state, g = this.blockSize / 2, y = 0;
              y < g;
              y++
            ) {
              var v = h[m + 2 * y],
                x = h[m + 2 * y + 1]
              ;((v =
                (((v << 8) | (v >>> 24)) & 16711935) |
                (((v << 24) | (v >>> 8)) & 4278255360)),
                (x =
                  (((x << 8) | (x >>> 24)) & 16711935) |
                  (((x << 24) | (x >>> 8)) & 4278255360)))
              var _ = w[y]
              ;((_.high ^= x), (_.low ^= v))
            }
            for (var b = 0; b < 24; b++) {
              for (var S = 0; S < 5; S++) {
                for (var A = 0, C = 0, P = 0; P < 5; P++) {
                  var _ = w[S + 5 * P]
                  ;((A ^= _.high), (C ^= _.low))
                }
                var k = f[S]
                ;((k.high = A), (k.low = C))
              }
              for (var S = 0; S < 5; S++)
                for (
                  var D = f[(S + 4) % 5],
                    T = f[(S + 1) % 5],
                    E = T.high,
                    O = T.low,
                    A = D.high ^ ((E << 1) | (O >>> 31)),
                    C = D.low ^ ((O << 1) | (E >>> 31)),
                    P = 0;
                  P < 5;
                  P++
                ) {
                  var _ = w[S + 5 * P]
                  ;((_.high ^= A), (_.low ^= C))
                }
              for (var q = 1; q < 25; q++) {
                var A,
                  C,
                  _ = w[q],
                  j = _.high,
                  W = _.low,
                  F = d[q]
                F < 32
                  ? ((A = (j << F) | (W >>> (32 - F))),
                    (C = (W << F) | (j >>> (32 - F))))
                  : ((A = (W << (F - 32)) | (j >>> (64 - F))),
                    (C = (j << (F - 32)) | (W >>> (64 - F))))
                var B = f[l[q]]
                ;((B.high = A), (B.low = C))
              }
              var R = f[0],
                I = w[0]
              ;((R.high = I.high), (R.low = I.low))
              for (var S = 0; S < 5; S++)
                for (var P = 0; P < 5; P++) {
                  var q = S + 5 * P,
                    _ = w[q],
                    Q = f[q],
                    V = f[((S + 1) % 5) + 5 * P],
                    _e = f[((S + 2) % 5) + 5 * P]
                  ;((_.high = Q.high ^ (~V.high & _e.high)),
                    (_.low = Q.low ^ (~V.low & _e.low)))
                }
              var _ = w[0],
                M = u[b]
              ;((_.high ^= M.high), (_.low ^= M.low))
            }
          },
          _doFinalize: function () {
            var h = this._data,
              m = h.words,
              w = this._nDataBytes * 8,
              g = h.sigBytes * 8,
              y = this.blockSize * 32
            ;((m[g >>> 5] |= 1 << (24 - (g % 32))),
              (m[((e.ceil((g + 1) / y) * y) >>> 5) - 1] |= 128),
              (h.sigBytes = m.length * 4),
              this._process())
            for (
              var v = this._state,
                x = this.cfg.outputLength / 8,
                _ = x / 8,
                b = [],
                S = 0;
              S < _;
              S++
            ) {
              var A = v[S],
                C = A.high,
                P = A.low
              ;((C =
                (((C << 8) | (C >>> 24)) & 16711935) |
                (((C << 24) | (C >>> 8)) & 4278255360)),
                (P =
                  (((P << 8) | (P >>> 24)) & 16711935) |
                  (((P << 24) | (P >>> 8)) & 4278255360)),
                b.push(P),
                b.push(C))
            }
            return new s.init(b, x)
          },
          clone: function () {
            for (
              var h = n.clone.call(this),
                m = (h._state = this._state.slice(0)),
                w = 0;
              w < 25;
              w++
            )
              m[w] = m[w].clone()
            return h
          },
        }))
        ;((t.SHA3 = n._createHelper(p)), (t.HmacSHA3 = n._createHmacHelper(p)))
      })(Math),
      r.SHA3
    )
  })
})
var nd = H((Ji, sd) => {
  ;(function (r, e) {
    typeof Ji == "object"
      ? (sd.exports = Ji = e(K()))
      : typeof define == "function" && define.amd
        ? define(["./core"], e)
        : e(r.CryptoJS)
  })(Ji, function (r) {
    return (
      (function (e) {
        var t = r,
          i = t.lib,
          s = i.WordArray,
          n = i.Hasher,
          o = t.algo,
          a = s.create([
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 7, 4, 13, 1,
            10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8, 3, 10, 14, 4, 9, 15, 8, 1,
            2, 7, 0, 6, 13, 11, 5, 12, 1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15,
            14, 5, 6, 2, 4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13,
          ]),
          c = s.create([
            5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12, 6, 11, 3, 7,
            0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2, 15, 5, 1, 3, 7, 14, 6, 9,
            11, 8, 12, 2, 10, 0, 4, 13, 8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13,
            9, 7, 10, 14, 12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11,
          ]),
          d = s.create([
            11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8, 7, 6, 8, 13,
            11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12, 11, 13, 6, 7, 14, 9, 13,
            15, 14, 8, 13, 6, 5, 12, 7, 5, 11, 12, 14, 15, 14, 15, 9, 8, 9, 14,
            5, 6, 8, 6, 5, 12, 9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8,
            5, 6,
          ]),
          l = s.create([
            8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6, 9, 13, 15,
            7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11, 9, 7, 15, 11, 8, 6, 6,
            14, 12, 13, 5, 14, 13, 13, 7, 5, 15, 5, 8, 11, 14, 14, 6, 14, 6, 9,
            12, 9, 12, 5, 15, 8, 8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13,
            11, 11,
          ]),
          u = s.create([0, 1518500249, 1859775393, 2400959708, 2840853838]),
          f = s.create([1352829926, 1548603684, 1836072691, 2053994217, 0]),
          p = (o.RIPEMD160 = n.extend({
            _doReset: function () {
              this._hash = s.create([
                1732584193, 4023233417, 2562383102, 271733878, 3285377520,
              ])
            },
            _doProcessBlock: function (x, _) {
              for (var b = 0; b < 16; b++) {
                var S = _ + b,
                  A = x[S]
                x[S] =
                  (((A << 8) | (A >>> 24)) & 16711935) |
                  (((A << 24) | (A >>> 8)) & 4278255360)
              }
              var C = this._hash.words,
                P = u.words,
                k = f.words,
                D = a.words,
                T = c.words,
                E = d.words,
                O = l.words,
                q,
                j,
                W,
                F,
                B,
                R,
                I,
                Q,
                V,
                _e
              ;((R = q = C[0]),
                (I = j = C[1]),
                (Q = W = C[2]),
                (V = F = C[3]),
                (_e = B = C[4]))
              for (var M, b = 0; b < 80; b += 1)
                ((M = (q + x[_ + D[b]]) | 0),
                  b < 16
                    ? (M += h(j, W, F) + P[0])
                    : b < 32
                      ? (M += m(j, W, F) + P[1])
                      : b < 48
                        ? (M += w(j, W, F) + P[2])
                        : b < 64
                          ? (M += g(j, W, F) + P[3])
                          : (M += y(j, W, F) + P[4]),
                  (M = M | 0),
                  (M = v(M, E[b])),
                  (M = (M + B) | 0),
                  (q = B),
                  (B = F),
                  (F = v(W, 10)),
                  (W = j),
                  (j = M),
                  (M = (R + x[_ + T[b]]) | 0),
                  b < 16
                    ? (M += y(I, Q, V) + k[0])
                    : b < 32
                      ? (M += g(I, Q, V) + k[1])
                      : b < 48
                        ? (M += w(I, Q, V) + k[2])
                        : b < 64
                          ? (M += m(I, Q, V) + k[3])
                          : (M += h(I, Q, V) + k[4]),
                  (M = M | 0),
                  (M = v(M, O[b])),
                  (M = (M + _e) | 0),
                  (R = _e),
                  (_e = V),
                  (V = v(Q, 10)),
                  (Q = I),
                  (I = M))
              ;((M = (C[1] + W + V) | 0),
                (C[1] = (C[2] + F + _e) | 0),
                (C[2] = (C[3] + B + R) | 0),
                (C[3] = (C[4] + q + I) | 0),
                (C[4] = (C[0] + j + Q) | 0),
                (C[0] = M))
            },
            _doFinalize: function () {
              var x = this._data,
                _ = x.words,
                b = this._nDataBytes * 8,
                S = x.sigBytes * 8
              ;((_[S >>> 5] |= 128 << (24 - (S % 32))),
                (_[(((S + 64) >>> 9) << 4) + 14] =
                  (((b << 8) | (b >>> 24)) & 16711935) |
                  (((b << 24) | (b >>> 8)) & 4278255360)),
                (x.sigBytes = (_.length + 1) * 4),
                this._process())
              for (var A = this._hash, C = A.words, P = 0; P < 5; P++) {
                var k = C[P]
                C[P] =
                  (((k << 8) | (k >>> 24)) & 16711935) |
                  (((k << 24) | (k >>> 8)) & 4278255360)
              }
              return A
            },
            clone: function () {
              var x = n.clone.call(this)
              return ((x._hash = this._hash.clone()), x)
            },
          }))
        function h(x, _, b) {
          return x ^ _ ^ b
        }
        function m(x, _, b) {
          return (x & _) | (~x & b)
        }
        function w(x, _, b) {
          return (x | ~_) ^ b
        }
        function g(x, _, b) {
          return (x & b) | (_ & ~b)
        }
        function y(x, _, b) {
          return x ^ (_ | ~b)
        }
        function v(x, _) {
          return (x << _) | (x >>> (32 - _))
        }
        ;((t.RIPEMD160 = n._createHelper(p)),
          (t.HmacRIPEMD160 = n._createHmacHelper(p)))
      })(Math),
      r.RIPEMD160
    )
  })
})
var Xi = H((Qi, od) => {
  ;(function (r, e) {
    typeof Qi == "object"
      ? (od.exports = Qi = e(K()))
      : typeof define == "function" && define.amd
        ? define(["./core"], e)
        : e(r.CryptoJS)
  })(Qi, function (r) {
    ;(function () {
      var e = r,
        t = e.lib,
        i = t.Base,
        s = e.enc,
        n = s.Utf8,
        o = e.algo,
        a = (o.HMAC = i.extend({
          init: function (c, d) {
            ;((c = this._hasher = new c.init()),
              typeof d == "string" && (d = n.parse(d)))
            var l = c.blockSize,
              u = l * 4
            ;(d.sigBytes > u && (d = c.finalize(d)), d.clamp())
            for (
              var f = (this._oKey = d.clone()),
                p = (this._iKey = d.clone()),
                h = f.words,
                m = p.words,
                w = 0;
              w < l;
              w++
            )
              ((h[w] ^= 1549556828), (m[w] ^= 909522486))
            ;((f.sigBytes = p.sigBytes = u), this.reset())
          },
          reset: function () {
            var c = this._hasher
            ;(c.reset(), c.update(this._iKey))
          },
          update: function (c) {
            return (this._hasher.update(c), this)
          },
          finalize: function (c) {
            var d = this._hasher,
              l = d.finalize(c)
            d.reset()
            var u = d.finalize(this._oKey.clone().concat(l))
            return u
          },
        }))
    })()
  })
})
var cd = H((Yi, ad) => {
  ;(function (r, e, t) {
    typeof Yi == "object"
      ? (ad.exports = Yi = e(K(), Hi(), Xi()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./sha256", "./hmac"], e)
        : e(r.CryptoJS)
  })(Yi, function (r) {
    return (
      (function () {
        var e = r,
          t = e.lib,
          i = t.Base,
          s = t.WordArray,
          n = e.algo,
          o = n.SHA256,
          a = n.HMAC,
          c = (n.PBKDF2 = i.extend({
            cfg: i.extend({ keySize: 128 / 32, hasher: o, iterations: 25e4 }),
            init: function (d) {
              this.cfg = this.cfg.extend(d)
            },
            compute: function (d, l) {
              for (
                var u = this.cfg,
                  f = a.create(u.hasher, d),
                  p = s.create(),
                  h = s.create([1]),
                  m = p.words,
                  w = h.words,
                  g = u.keySize,
                  y = u.iterations;
                m.length < g;
              ) {
                var v = f.update(l).finalize(h)
                f.reset()
                for (var x = v.words, _ = x.length, b = v, S = 1; S < y; S++) {
                  ;((b = f.finalize(b)), f.reset())
                  for (var A = b.words, C = 0; C < _; C++) x[C] ^= A[C]
                }
                ;(p.concat(v), w[0]++)
              }
              return ((p.sigBytes = g * 4), p)
            },
          }))
        e.PBKDF2 = function (d, l, u) {
          return c.create(u).compute(d, l)
        }
      })(),
      r.PBKDF2
    )
  })
})
var Ye = H((Zi, dd) => {
  ;(function (r, e, t) {
    typeof Zi == "object"
      ? (dd.exports = Zi = e(K(), Ln(), Xi()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./sha1", "./hmac"], e)
        : e(r.CryptoJS)
  })(Zi, function (r) {
    return (
      (function () {
        var e = r,
          t = e.lib,
          i = t.Base,
          s = t.WordArray,
          n = e.algo,
          o = n.MD5,
          a = (n.EvpKDF = i.extend({
            cfg: i.extend({ keySize: 128 / 32, hasher: o, iterations: 1 }),
            init: function (c) {
              this.cfg = this.cfg.extend(c)
            },
            compute: function (c, d) {
              for (
                var l,
                  u = this.cfg,
                  f = u.hasher.create(),
                  p = s.create(),
                  h = p.words,
                  m = u.keySize,
                  w = u.iterations;
                h.length < m;
              ) {
                ;(l && f.update(l), (l = f.update(c).finalize(d)), f.reset())
                for (var g = 1; g < w; g++) ((l = f.finalize(l)), f.reset())
                p.concat(l)
              }
              return ((p.sigBytes = m * 4), p)
            },
          }))
        e.EvpKDF = function (c, d, l) {
          return a.create(l).compute(c, d)
        }
      })(),
      r.EvpKDF
    )
  })
})
var le = H((es, ld) => {
  ;(function (r, e, t) {
    typeof es == "object"
      ? (ld.exports = es = e(K(), Ye()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./evpkdf"], e)
        : e(r.CryptoJS)
  })(es, function (r) {
    r.lib.Cipher ||
      (function (e) {
        var t = r,
          i = t.lib,
          s = i.Base,
          n = i.WordArray,
          o = i.BufferedBlockAlgorithm,
          a = t.enc,
          c = a.Utf8,
          d = a.Base64,
          l = t.algo,
          u = l.EvpKDF,
          f = (i.Cipher = o.extend({
            cfg: s.extend(),
            createEncryptor: function (k, D) {
              return this.create(this._ENC_XFORM_MODE, k, D)
            },
            createDecryptor: function (k, D) {
              return this.create(this._DEC_XFORM_MODE, k, D)
            },
            init: function (k, D, T) {
              ;((this.cfg = this.cfg.extend(T)),
                (this._xformMode = k),
                (this._key = D),
                this.reset())
            },
            reset: function () {
              ;(o.reset.call(this), this._doReset())
            },
            process: function (k) {
              return (this._append(k), this._process())
            },
            finalize: function (k) {
              k && this._append(k)
              var D = this._doFinalize()
              return D
            },
            keySize: 128 / 32,
            ivSize: 128 / 32,
            _ENC_XFORM_MODE: 1,
            _DEC_XFORM_MODE: 2,
            _createHelper: (function () {
              function k(D) {
                return typeof D == "string" ? P : S
              }
              return function (D) {
                return {
                  encrypt: function (T, E, O) {
                    return k(E).encrypt(D, T, E, O)
                  },
                  decrypt: function (T, E, O) {
                    return k(E).decrypt(D, T, E, O)
                  },
                }
              }
            })(),
          })),
          p = (i.StreamCipher = f.extend({
            _doFinalize: function () {
              var k = this._process(!0)
              return k
            },
            blockSize: 1,
          })),
          h = (t.mode = {}),
          m = (i.BlockCipherMode = s.extend({
            createEncryptor: function (k, D) {
              return this.Encryptor.create(k, D)
            },
            createDecryptor: function (k, D) {
              return this.Decryptor.create(k, D)
            },
            init: function (k, D) {
              ;((this._cipher = k), (this._iv = D))
            },
          })),
          w = (h.CBC = (function () {
            var k = m.extend()
            ;((k.Encryptor = k.extend({
              processBlock: function (T, E) {
                var O = this._cipher,
                  q = O.blockSize
                ;(D.call(this, T, E, q),
                  O.encryptBlock(T, E),
                  (this._prevBlock = T.slice(E, E + q)))
              },
            })),
              (k.Decryptor = k.extend({
                processBlock: function (T, E) {
                  var O = this._cipher,
                    q = O.blockSize,
                    j = T.slice(E, E + q)
                  ;(O.decryptBlock(T, E),
                    D.call(this, T, E, q),
                    (this._prevBlock = j))
                },
              })))
            function D(T, E, O) {
              var q,
                j = this._iv
              j ? ((q = j), (this._iv = e)) : (q = this._prevBlock)
              for (var W = 0; W < O; W++) T[E + W] ^= q[W]
            }
            return k
          })()),
          g = (t.pad = {}),
          y = (g.Pkcs7 = {
            pad: function (k, D) {
              for (
                var T = D * 4,
                  E = T - (k.sigBytes % T),
                  O = (E << 24) | (E << 16) | (E << 8) | E,
                  q = [],
                  j = 0;
                j < E;
                j += 4
              )
                q.push(O)
              var W = n.create(q, E)
              k.concat(W)
            },
            unpad: function (k) {
              var D = k.words[(k.sigBytes - 1) >>> 2] & 255
              k.sigBytes -= D
            },
          }),
          v = (i.BlockCipher = f.extend({
            cfg: f.cfg.extend({ mode: w, padding: y }),
            reset: function () {
              var k
              f.reset.call(this)
              var D = this.cfg,
                T = D.iv,
                E = D.mode
              ;(this._xformMode == this._ENC_XFORM_MODE
                ? (k = E.createEncryptor)
                : ((k = E.createDecryptor), (this._minBufferSize = 1)),
                this._mode && this._mode.__creator == k
                  ? this._mode.init(this, T && T.words)
                  : ((this._mode = k.call(E, this, T && T.words)),
                    (this._mode.__creator = k)))
            },
            _doProcessBlock: function (k, D) {
              this._mode.processBlock(k, D)
            },
            _doFinalize: function () {
              var k,
                D = this.cfg.padding
              return (
                this._xformMode == this._ENC_XFORM_MODE
                  ? (D.pad(this._data, this.blockSize), (k = this._process(!0)))
                  : ((k = this._process(!0)), D.unpad(k)),
                k
              )
            },
            blockSize: 128 / 32,
          })),
          x = (i.CipherParams = s.extend({
            init: function (k) {
              this.mixIn(k)
            },
            toString: function (k) {
              return (k || this.formatter).stringify(this)
            },
          })),
          _ = (t.format = {}),
          b = (_.OpenSSL = {
            stringify: function (k) {
              var D,
                T = k.ciphertext,
                E = k.salt
              return (
                E
                  ? (D = n.create([1398893684, 1701076831]).concat(E).concat(T))
                  : (D = T),
                D.toString(d)
              )
            },
            parse: function (k) {
              var D,
                T = d.parse(k),
                E = T.words
              return (
                E[0] == 1398893684 &&
                  E[1] == 1701076831 &&
                  ((D = n.create(E.slice(2, 4))),
                  E.splice(0, 4),
                  (T.sigBytes -= 16)),
                x.create({ ciphertext: T, salt: D })
              )
            },
          }),
          S = (i.SerializableCipher = s.extend({
            cfg: s.extend({ format: b }),
            encrypt: function (k, D, T, E) {
              E = this.cfg.extend(E)
              var O = k.createEncryptor(T, E),
                q = O.finalize(D),
                j = O.cfg
              return x.create({
                ciphertext: q,
                key: T,
                iv: j.iv,
                algorithm: k,
                mode: j.mode,
                padding: j.padding,
                blockSize: k.blockSize,
                formatter: E.format,
              })
            },
            decrypt: function (k, D, T, E) {
              ;((E = this.cfg.extend(E)), (D = this._parse(D, E.format)))
              var O = k.createDecryptor(T, E).finalize(D.ciphertext)
              return O
            },
            _parse: function (k, D) {
              return typeof k == "string" ? D.parse(k, this) : k
            },
          })),
          A = (t.kdf = {}),
          C = (A.OpenSSL = {
            execute: function (k, D, T, E, O) {
              if ((E || (E = n.random(64 / 8)), O))
                var q = u.create({ keySize: D + T, hasher: O }).compute(k, E)
              else var q = u.create({ keySize: D + T }).compute(k, E)
              var j = n.create(q.words.slice(D), T * 4)
              return (
                (q.sigBytes = D * 4),
                x.create({ key: q, iv: j, salt: E })
              )
            },
          }),
          P = (i.PasswordBasedCipher = S.extend({
            cfg: S.cfg.extend({ kdf: C }),
            encrypt: function (k, D, T, E) {
              E = this.cfg.extend(E)
              var O = E.kdf.execute(T, k.keySize, k.ivSize, E.salt, E.hasher)
              E.iv = O.iv
              var q = S.encrypt.call(this, k, D, O.key, E)
              return (q.mixIn(O), q)
            },
            decrypt: function (k, D, T, E) {
              ;((E = this.cfg.extend(E)), (D = this._parse(D, E.format)))
              var O = E.kdf.execute(T, k.keySize, k.ivSize, D.salt, E.hasher)
              E.iv = O.iv
              var q = S.decrypt.call(this, k, D, O.key, E)
              return q
            },
          }))
      })()
  })
})
var fd = H((ts, ud) => {
  ;(function (r, e, t) {
    typeof ts == "object"
      ? (ud.exports = ts = e(K(), le()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./cipher-core"], e)
        : e(r.CryptoJS)
  })(ts, function (r) {
    return (
      (r.mode.CFB = (function () {
        var e = r.lib.BlockCipherMode.extend()
        ;((e.Encryptor = e.extend({
          processBlock: function (i, s) {
            var n = this._cipher,
              o = n.blockSize
            ;(t.call(this, i, s, o, n), (this._prevBlock = i.slice(s, s + o)))
          },
        })),
          (e.Decryptor = e.extend({
            processBlock: function (i, s) {
              var n = this._cipher,
                o = n.blockSize,
                a = i.slice(s, s + o)
              ;(t.call(this, i, s, o, n), (this._prevBlock = a))
            },
          })))
        function t(i, s, n, o) {
          var a,
            c = this._iv
          ;(c ? ((a = c.slice(0)), (this._iv = void 0)) : (a = this._prevBlock),
            o.encryptBlock(a, 0))
          for (var d = 0; d < n; d++) i[s + d] ^= a[d]
        }
        return e
      })()),
      r.mode.CFB
    )
  })
})
var hd = H((rs, pd) => {
  ;(function (r, e, t) {
    typeof rs == "object"
      ? (pd.exports = rs = e(K(), le()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./cipher-core"], e)
        : e(r.CryptoJS)
  })(rs, function (r) {
    return (
      (r.mode.CTR = (function () {
        var e = r.lib.BlockCipherMode.extend(),
          t = (e.Encryptor = e.extend({
            processBlock: function (i, s) {
              var n = this._cipher,
                o = n.blockSize,
                a = this._iv,
                c = this._counter
              a && ((c = this._counter = a.slice(0)), (this._iv = void 0))
              var d = c.slice(0)
              ;(n.encryptBlock(d, 0), (c[o - 1] = (c[o - 1] + 1) | 0))
              for (var l = 0; l < o; l++) i[s + l] ^= d[l]
            },
          }))
        return ((e.Decryptor = t), e)
      })()),
      r.mode.CTR
    )
  })
})
var md = H((is, gd) => {
  ;(function (r, e, t) {
    typeof is == "object"
      ? (gd.exports = is = e(K(), le()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./cipher-core"], e)
        : e(r.CryptoJS)
  })(is, function (r) {
    return (
      (r.mode.CTRGladman = (function () {
        var e = r.lib.BlockCipherMode.extend()
        function t(n) {
          if (((n >> 24) & 255) === 255) {
            var o = (n >> 16) & 255,
              a = (n >> 8) & 255,
              c = n & 255
            ;(o === 255
              ? ((o = 0),
                a === 255 ? ((a = 0), c === 255 ? (c = 0) : ++c) : ++a)
              : ++o,
              (n = 0),
              (n += o << 16),
              (n += a << 8),
              (n += c))
          } else n += 1 << 24
          return n
        }
        function i(n) {
          return ((n[0] = t(n[0])) === 0 && (n[1] = t(n[1])), n)
        }
        var s = (e.Encryptor = e.extend({
          processBlock: function (n, o) {
            var a = this._cipher,
              c = a.blockSize,
              d = this._iv,
              l = this._counter
            ;(d && ((l = this._counter = d.slice(0)), (this._iv = void 0)),
              i(l))
            var u = l.slice(0)
            a.encryptBlock(u, 0)
            for (var f = 0; f < c; f++) n[o + f] ^= u[f]
          },
        }))
        return ((e.Decryptor = s), e)
      })()),
      r.mode.CTRGladman
    )
  })
})
var wd = H((ss, yd) => {
  ;(function (r, e, t) {
    typeof ss == "object"
      ? (yd.exports = ss = e(K(), le()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./cipher-core"], e)
        : e(r.CryptoJS)
  })(ss, function (r) {
    return (
      (r.mode.OFB = (function () {
        var e = r.lib.BlockCipherMode.extend(),
          t = (e.Encryptor = e.extend({
            processBlock: function (i, s) {
              var n = this._cipher,
                o = n.blockSize,
                a = this._iv,
                c = this._keystream
              ;(a && ((c = this._keystream = a.slice(0)), (this._iv = void 0)),
                n.encryptBlock(c, 0))
              for (var d = 0; d < o; d++) i[s + d] ^= c[d]
            },
          }))
        return ((e.Decryptor = t), e)
      })()),
      r.mode.OFB
    )
  })
})
var _d = H((ns, xd) => {
  ;(function (r, e, t) {
    typeof ns == "object"
      ? (xd.exports = ns = e(K(), le()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./cipher-core"], e)
        : e(r.CryptoJS)
  })(ns, function (r) {
    return (
      (r.mode.ECB = (function () {
        var e = r.lib.BlockCipherMode.extend()
        return (
          (e.Encryptor = e.extend({
            processBlock: function (t, i) {
              this._cipher.encryptBlock(t, i)
            },
          })),
          (e.Decryptor = e.extend({
            processBlock: function (t, i) {
              this._cipher.decryptBlock(t, i)
            },
          })),
          e
        )
      })()),
      r.mode.ECB
    )
  })
})
var bd = H((os, vd) => {
  ;(function (r, e, t) {
    typeof os == "object"
      ? (vd.exports = os = e(K(), le()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./cipher-core"], e)
        : e(r.CryptoJS)
  })(os, function (r) {
    return (
      (r.pad.AnsiX923 = {
        pad: function (e, t) {
          var i = e.sigBytes,
            s = t * 4,
            n = s - (i % s),
            o = i + n - 1
          ;(e.clamp(),
            (e.words[o >>> 2] |= n << (24 - (o % 4) * 8)),
            (e.sigBytes += n))
        },
        unpad: function (e) {
          var t = e.words[(e.sigBytes - 1) >>> 2] & 255
          e.sigBytes -= t
        },
      }),
      r.pad.Ansix923
    )
  })
})
var Sd = H((as, kd) => {
  ;(function (r, e, t) {
    typeof as == "object"
      ? (kd.exports = as = e(K(), le()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./cipher-core"], e)
        : e(r.CryptoJS)
  })(as, function (r) {
    return (
      (r.pad.Iso10126 = {
        pad: function (e, t) {
          var i = t * 4,
            s = i - (e.sigBytes % i)
          e.concat(r.lib.WordArray.random(s - 1)).concat(
            r.lib.WordArray.create([s << 24], 1),
          )
        },
        unpad: function (e) {
          var t = e.words[(e.sigBytes - 1) >>> 2] & 255
          e.sigBytes -= t
        },
      }),
      r.pad.Iso10126
    )
  })
})
var Ad = H((cs, Pd) => {
  ;(function (r, e, t) {
    typeof cs == "object"
      ? (Pd.exports = cs = e(K(), le()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./cipher-core"], e)
        : e(r.CryptoJS)
  })(cs, function (r) {
    return (
      (r.pad.Iso97971 = {
        pad: function (e, t) {
          ;(e.concat(r.lib.WordArray.create([2147483648], 1)),
            r.pad.ZeroPadding.pad(e, t))
        },
        unpad: function (e) {
          ;(r.pad.ZeroPadding.unpad(e), e.sigBytes--)
        },
      }),
      r.pad.Iso97971
    )
  })
})
var Ed = H((ds, Cd) => {
  ;(function (r, e, t) {
    typeof ds == "object"
      ? (Cd.exports = ds = e(K(), le()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./cipher-core"], e)
        : e(r.CryptoJS)
  })(ds, function (r) {
    return (
      (r.pad.ZeroPadding = {
        pad: function (e, t) {
          var i = t * 4
          ;(e.clamp(), (e.sigBytes += i - (e.sigBytes % i || i)))
        },
        unpad: function (e) {
          for (
            var t = e.words, i = e.sigBytes - 1, i = e.sigBytes - 1;
            i >= 0;
            i--
          )
            if ((t[i >>> 2] >>> (24 - (i % 4) * 8)) & 255) {
              e.sigBytes = i + 1
              break
            }
        },
      }),
      r.pad.ZeroPadding
    )
  })
})
var Fd = H((ls, Dd) => {
  ;(function (r, e, t) {
    typeof ls == "object"
      ? (Dd.exports = ls = e(K(), le()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./cipher-core"], e)
        : e(r.CryptoJS)
  })(ls, function (r) {
    return (
      (r.pad.NoPadding = { pad: function () {}, unpad: function () {} }),
      r.pad.NoPadding
    )
  })
})
var Id = H((us, Td) => {
  ;(function (r, e, t) {
    typeof us == "object"
      ? (Td.exports = us = e(K(), le()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./cipher-core"], e)
        : e(r.CryptoJS)
  })(us, function (r) {
    return (
      (function (e) {
        var t = r,
          i = t.lib,
          s = i.CipherParams,
          n = t.enc,
          o = n.Hex,
          a = t.format,
          c = (a.Hex = {
            stringify: function (d) {
              return d.ciphertext.toString(o)
            },
            parse: function (d) {
              var l = o.parse(d)
              return s.create({ ciphertext: l })
            },
          })
      })(),
      r.format.Hex
    )
  })
})
var Rd = H((fs, Bd) => {
  ;(function (r, e, t) {
    typeof fs == "object"
      ? (Bd.exports = fs = e(K(), ut(), ft(), Ye(), le()))
      : typeof define == "function" && define.amd
        ? define(
            ["./core", "./enc-base64", "./md5", "./evpkdf", "./cipher-core"],
            e,
          )
        : e(r.CryptoJS)
  })(fs, function (r) {
    return (
      (function () {
        var e = r,
          t = e.lib,
          i = t.BlockCipher,
          s = e.algo,
          n = [],
          o = [],
          a = [],
          c = [],
          d = [],
          l = [],
          u = [],
          f = [],
          p = [],
          h = []
        ;(function () {
          for (var g = [], y = 0; y < 256; y++)
            y < 128 ? (g[y] = y << 1) : (g[y] = (y << 1) ^ 283)
          for (var v = 0, x = 0, y = 0; y < 256; y++) {
            var _ = x ^ (x << 1) ^ (x << 2) ^ (x << 3) ^ (x << 4)
            ;((_ = (_ >>> 8) ^ (_ & 255) ^ 99), (n[v] = _), (o[_] = v))
            var b = g[v],
              S = g[b],
              A = g[S],
              C = (g[_] * 257) ^ (_ * 16843008)
            ;((a[v] = (C << 24) | (C >>> 8)),
              (c[v] = (C << 16) | (C >>> 16)),
              (d[v] = (C << 8) | (C >>> 24)),
              (l[v] = C))
            var C = (A * 16843009) ^ (S * 65537) ^ (b * 257) ^ (v * 16843008)
            ;((u[_] = (C << 24) | (C >>> 8)),
              (f[_] = (C << 16) | (C >>> 16)),
              (p[_] = (C << 8) | (C >>> 24)),
              (h[_] = C),
              v ? ((v = b ^ g[g[g[A ^ b]]]), (x ^= g[g[x]])) : (v = x = 1))
          }
        })()
        var m = [0, 1, 2, 4, 8, 16, 32, 64, 128, 27, 54],
          w = (s.AES = i.extend({
            _doReset: function () {
              var g
              if (!(this._nRounds && this._keyPriorReset === this._key)) {
                for (
                  var y = (this._keyPriorReset = this._key),
                    v = y.words,
                    x = y.sigBytes / 4,
                    _ = (this._nRounds = x + 6),
                    b = (_ + 1) * 4,
                    S = (this._keySchedule = []),
                    A = 0;
                  A < b;
                  A++
                )
                  A < x
                    ? (S[A] = v[A])
                    : ((g = S[A - 1]),
                      A % x
                        ? x > 6 &&
                          A % x == 4 &&
                          (g =
                            (n[g >>> 24] << 24) |
                            (n[(g >>> 16) & 255] << 16) |
                            (n[(g >>> 8) & 255] << 8) |
                            n[g & 255])
                        : ((g = (g << 8) | (g >>> 24)),
                          (g =
                            (n[g >>> 24] << 24) |
                            (n[(g >>> 16) & 255] << 16) |
                            (n[(g >>> 8) & 255] << 8) |
                            n[g & 255]),
                          (g ^= m[(A / x) | 0] << 24)),
                      (S[A] = S[A - x] ^ g))
                for (var C = (this._invKeySchedule = []), P = 0; P < b; P++) {
                  var A = b - P
                  if (P % 4) var g = S[A]
                  else var g = S[A - 4]
                  P < 4 || A <= 4
                    ? (C[P] = g)
                    : (C[P] =
                        u[n[g >>> 24]] ^
                        f[n[(g >>> 16) & 255]] ^
                        p[n[(g >>> 8) & 255]] ^
                        h[n[g & 255]])
                }
              }
            },
            encryptBlock: function (g, y) {
              this._doCryptBlock(g, y, this._keySchedule, a, c, d, l, n)
            },
            decryptBlock: function (g, y) {
              var v = g[y + 1]
              ;((g[y + 1] = g[y + 3]),
                (g[y + 3] = v),
                this._doCryptBlock(g, y, this._invKeySchedule, u, f, p, h, o))
              var v = g[y + 1]
              ;((g[y + 1] = g[y + 3]), (g[y + 3] = v))
            },
            _doCryptBlock: function (g, y, v, x, _, b, S, A) {
              for (
                var C = this._nRounds,
                  P = g[y] ^ v[0],
                  k = g[y + 1] ^ v[1],
                  D = g[y + 2] ^ v[2],
                  T = g[y + 3] ^ v[3],
                  E = 4,
                  O = 1;
                O < C;
                O++
              ) {
                var q =
                    x[P >>> 24] ^
                    _[(k >>> 16) & 255] ^
                    b[(D >>> 8) & 255] ^
                    S[T & 255] ^
                    v[E++],
                  j =
                    x[k >>> 24] ^
                    _[(D >>> 16) & 255] ^
                    b[(T >>> 8) & 255] ^
                    S[P & 255] ^
                    v[E++],
                  W =
                    x[D >>> 24] ^
                    _[(T >>> 16) & 255] ^
                    b[(P >>> 8) & 255] ^
                    S[k & 255] ^
                    v[E++],
                  F =
                    x[T >>> 24] ^
                    _[(P >>> 16) & 255] ^
                    b[(k >>> 8) & 255] ^
                    S[D & 255] ^
                    v[E++]
                ;((P = q), (k = j), (D = W), (T = F))
              }
              var q =
                  ((A[P >>> 24] << 24) |
                    (A[(k >>> 16) & 255] << 16) |
                    (A[(D >>> 8) & 255] << 8) |
                    A[T & 255]) ^
                  v[E++],
                j =
                  ((A[k >>> 24] << 24) |
                    (A[(D >>> 16) & 255] << 16) |
                    (A[(T >>> 8) & 255] << 8) |
                    A[P & 255]) ^
                  v[E++],
                W =
                  ((A[D >>> 24] << 24) |
                    (A[(T >>> 16) & 255] << 16) |
                    (A[(P >>> 8) & 255] << 8) |
                    A[k & 255]) ^
                  v[E++],
                F =
                  ((A[T >>> 24] << 24) |
                    (A[(P >>> 16) & 255] << 16) |
                    (A[(k >>> 8) & 255] << 8) |
                    A[D & 255]) ^
                  v[E++]
              ;((g[y] = q), (g[y + 1] = j), (g[y + 2] = W), (g[y + 3] = F))
            },
            keySize: 256 / 32,
          }))
        e.AES = i._createHelper(w)
      })(),
      r.AES
    )
  })
})
var qd = H((ps, Ud) => {
  ;(function (r, e, t) {
    typeof ps == "object"
      ? (Ud.exports = ps = e(K(), ut(), ft(), Ye(), le()))
      : typeof define == "function" && define.amd
        ? define(
            ["./core", "./enc-base64", "./md5", "./evpkdf", "./cipher-core"],
            e,
          )
        : e(r.CryptoJS)
  })(ps, function (r) {
    return (
      (function () {
        var e = r,
          t = e.lib,
          i = t.WordArray,
          s = t.BlockCipher,
          n = e.algo,
          o = [
            57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51,
            43, 35, 27, 19, 11, 3, 60, 52, 44, 36, 63, 55, 47, 39, 31, 23, 15,
            7, 62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28,
            20, 12, 4,
          ],
          a = [
            14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10, 23, 19, 12, 4, 26, 8,
            16, 7, 27, 20, 13, 2, 41, 52, 31, 37, 47, 55, 30, 40, 51, 45, 33,
            48, 44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32,
          ],
          c = [1, 2, 4, 6, 8, 10, 12, 14, 15, 17, 19, 21, 23, 25, 27, 28],
          d = [
            {
              0: 8421888,
              268435456: 32768,
              536870912: 8421378,
              805306368: 2,
              1073741824: 512,
              1342177280: 8421890,
              1610612736: 8389122,
              1879048192: 8388608,
              2147483648: 514,
              2415919104: 8389120,
              2684354560: 33280,
              2952790016: 8421376,
              3221225472: 32770,
              3489660928: 8388610,
              3758096384: 0,
              4026531840: 33282,
              134217728: 0,
              402653184: 8421890,
              671088640: 33282,
              939524096: 32768,
              1207959552: 8421888,
              1476395008: 512,
              1744830464: 8421378,
              2013265920: 2,
              2281701376: 8389120,
              2550136832: 33280,
              2818572288: 8421376,
              3087007744: 8389122,
              3355443200: 8388610,
              3623878656: 32770,
              3892314112: 514,
              4160749568: 8388608,
              1: 32768,
              268435457: 2,
              536870913: 8421888,
              805306369: 8388608,
              1073741825: 8421378,
              1342177281: 33280,
              1610612737: 512,
              1879048193: 8389122,
              2147483649: 8421890,
              2415919105: 8421376,
              2684354561: 8388610,
              2952790017: 33282,
              3221225473: 514,
              3489660929: 8389120,
              3758096385: 32770,
              4026531841: 0,
              134217729: 8421890,
              402653185: 8421376,
              671088641: 8388608,
              939524097: 512,
              1207959553: 32768,
              1476395009: 8388610,
              1744830465: 2,
              2013265921: 33282,
              2281701377: 32770,
              2550136833: 8389122,
              2818572289: 514,
              3087007745: 8421888,
              3355443201: 8389120,
              3623878657: 0,
              3892314113: 33280,
              4160749569: 8421378,
            },
            {
              0: 1074282512,
              16777216: 16384,
              33554432: 524288,
              50331648: 1074266128,
              67108864: 1073741840,
              83886080: 1074282496,
              100663296: 1073758208,
              117440512: 16,
              134217728: 540672,
              150994944: 1073758224,
              167772160: 1073741824,
              184549376: 540688,
              201326592: 524304,
              218103808: 0,
              234881024: 16400,
              251658240: 1074266112,
              8388608: 1073758208,
              25165824: 540688,
              41943040: 16,
              58720256: 1073758224,
              75497472: 1074282512,
              92274688: 1073741824,
              109051904: 524288,
              125829120: 1074266128,
              142606336: 524304,
              159383552: 0,
              176160768: 16384,
              192937984: 1074266112,
              209715200: 1073741840,
              226492416: 540672,
              243269632: 1074282496,
              260046848: 16400,
              268435456: 0,
              285212672: 1074266128,
              301989888: 1073758224,
              318767104: 1074282496,
              335544320: 1074266112,
              352321536: 16,
              369098752: 540688,
              385875968: 16384,
              402653184: 16400,
              419430400: 524288,
              436207616: 524304,
              452984832: 1073741840,
              469762048: 540672,
              486539264: 1073758208,
              503316480: 1073741824,
              520093696: 1074282512,
              276824064: 540688,
              293601280: 524288,
              310378496: 1074266112,
              327155712: 16384,
              343932928: 1073758208,
              360710144: 1074282512,
              377487360: 16,
              394264576: 1073741824,
              411041792: 1074282496,
              427819008: 1073741840,
              444596224: 1073758224,
              461373440: 524304,
              478150656: 0,
              494927872: 16400,
              511705088: 1074266128,
              528482304: 540672,
            },
            {
              0: 260,
              1048576: 0,
              2097152: 67109120,
              3145728: 65796,
              4194304: 65540,
              5242880: 67108868,
              6291456: 67174660,
              7340032: 67174400,
              8388608: 67108864,
              9437184: 67174656,
              10485760: 65792,
              11534336: 67174404,
              12582912: 67109124,
              13631488: 65536,
              14680064: 4,
              15728640: 256,
              524288: 67174656,
              1572864: 67174404,
              2621440: 0,
              3670016: 67109120,
              4718592: 67108868,
              5767168: 65536,
              6815744: 65540,
              7864320: 260,
              8912896: 4,
              9961472: 256,
              11010048: 67174400,
              12058624: 65796,
              13107200: 65792,
              14155776: 67109124,
              15204352: 67174660,
              16252928: 67108864,
              16777216: 67174656,
              17825792: 65540,
              18874368: 65536,
              19922944: 67109120,
              20971520: 256,
              22020096: 67174660,
              23068672: 67108868,
              24117248: 0,
              25165824: 67109124,
              26214400: 67108864,
              27262976: 4,
              28311552: 65792,
              29360128: 67174400,
              30408704: 260,
              31457280: 65796,
              32505856: 67174404,
              17301504: 67108864,
              18350080: 260,
              19398656: 67174656,
              20447232: 0,
              21495808: 65540,
              22544384: 67109120,
              23592960: 256,
              24641536: 67174404,
              25690112: 65536,
              26738688: 67174660,
              27787264: 65796,
              28835840: 67108868,
              29884416: 67109124,
              30932992: 67174400,
              31981568: 4,
              33030144: 65792,
            },
            {
              0: 2151682048,
              65536: 2147487808,
              131072: 4198464,
              196608: 2151677952,
              262144: 0,
              327680: 4198400,
              393216: 2147483712,
              458752: 4194368,
              524288: 2147483648,
              589824: 4194304,
              655360: 64,
              720896: 2147487744,
              786432: 2151678016,
              851968: 4160,
              917504: 4096,
              983040: 2151682112,
              32768: 2147487808,
              98304: 64,
              163840: 2151678016,
              229376: 2147487744,
              294912: 4198400,
              360448: 2151682112,
              425984: 0,
              491520: 2151677952,
              557056: 4096,
              622592: 2151682048,
              688128: 4194304,
              753664: 4160,
              819200: 2147483648,
              884736: 4194368,
              950272: 4198464,
              1015808: 2147483712,
              1048576: 4194368,
              1114112: 4198400,
              1179648: 2147483712,
              1245184: 0,
              1310720: 4160,
              1376256: 2151678016,
              1441792: 2151682048,
              1507328: 2147487808,
              1572864: 2151682112,
              1638400: 2147483648,
              1703936: 2151677952,
              1769472: 4198464,
              1835008: 2147487744,
              1900544: 4194304,
              1966080: 64,
              2031616: 4096,
              1081344: 2151677952,
              1146880: 2151682112,
              1212416: 0,
              1277952: 4198400,
              1343488: 4194368,
              1409024: 2147483648,
              1474560: 2147487808,
              1540096: 64,
              1605632: 2147483712,
              1671168: 4096,
              1736704: 2147487744,
              1802240: 2151678016,
              1867776: 4160,
              1933312: 2151682048,
              1998848: 4194304,
              2064384: 4198464,
            },
            {
              0: 128,
              4096: 17039360,
              8192: 262144,
              12288: 536870912,
              16384: 537133184,
              20480: 16777344,
              24576: 553648256,
              28672: 262272,
              32768: 16777216,
              36864: 537133056,
              40960: 536871040,
              45056: 553910400,
              49152: 553910272,
              53248: 0,
              57344: 17039488,
              61440: 553648128,
              2048: 17039488,
              6144: 553648256,
              10240: 128,
              14336: 17039360,
              18432: 262144,
              22528: 537133184,
              26624: 553910272,
              30720: 536870912,
              34816: 537133056,
              38912: 0,
              43008: 553910400,
              47104: 16777344,
              51200: 536871040,
              55296: 553648128,
              59392: 16777216,
              63488: 262272,
              65536: 262144,
              69632: 128,
              73728: 536870912,
              77824: 553648256,
              81920: 16777344,
              86016: 553910272,
              90112: 537133184,
              94208: 16777216,
              98304: 553910400,
              102400: 553648128,
              106496: 17039360,
              110592: 537133056,
              114688: 262272,
              118784: 536871040,
              122880: 0,
              126976: 17039488,
              67584: 553648256,
              71680: 16777216,
              75776: 17039360,
              79872: 537133184,
              83968: 536870912,
              88064: 17039488,
              92160: 128,
              96256: 553910272,
              100352: 262272,
              104448: 553910400,
              108544: 0,
              112640: 553648128,
              116736: 16777344,
              120832: 262144,
              124928: 537133056,
              129024: 536871040,
            },
            {
              0: 268435464,
              256: 8192,
              512: 270532608,
              768: 270540808,
              1024: 268443648,
              1280: 2097152,
              1536: 2097160,
              1792: 268435456,
              2048: 0,
              2304: 268443656,
              2560: 2105344,
              2816: 8,
              3072: 270532616,
              3328: 2105352,
              3584: 8200,
              3840: 270540800,
              128: 270532608,
              384: 270540808,
              640: 8,
              896: 2097152,
              1152: 2105352,
              1408: 268435464,
              1664: 268443648,
              1920: 8200,
              2176: 2097160,
              2432: 8192,
              2688: 268443656,
              2944: 270532616,
              3200: 0,
              3456: 270540800,
              3712: 2105344,
              3968: 268435456,
              4096: 268443648,
              4352: 270532616,
              4608: 270540808,
              4864: 8200,
              5120: 2097152,
              5376: 268435456,
              5632: 268435464,
              5888: 2105344,
              6144: 2105352,
              6400: 0,
              6656: 8,
              6912: 270532608,
              7168: 8192,
              7424: 268443656,
              7680: 270540800,
              7936: 2097160,
              4224: 8,
              4480: 2105344,
              4736: 2097152,
              4992: 268435464,
              5248: 268443648,
              5504: 8200,
              5760: 270540808,
              6016: 270532608,
              6272: 270540800,
              6528: 270532616,
              6784: 8192,
              7040: 2105352,
              7296: 2097160,
              7552: 0,
              7808: 268435456,
              8064: 268443656,
            },
            {
              0: 1048576,
              16: 33555457,
              32: 1024,
              48: 1049601,
              64: 34604033,
              80: 0,
              96: 1,
              112: 34603009,
              128: 33555456,
              144: 1048577,
              160: 33554433,
              176: 34604032,
              192: 34603008,
              208: 1025,
              224: 1049600,
              240: 33554432,
              8: 34603009,
              24: 0,
              40: 33555457,
              56: 34604032,
              72: 1048576,
              88: 33554433,
              104: 33554432,
              120: 1025,
              136: 1049601,
              152: 33555456,
              168: 34603008,
              184: 1048577,
              200: 1024,
              216: 34604033,
              232: 1,
              248: 1049600,
              256: 33554432,
              272: 1048576,
              288: 33555457,
              304: 34603009,
              320: 1048577,
              336: 33555456,
              352: 34604032,
              368: 1049601,
              384: 1025,
              400: 34604033,
              416: 1049600,
              432: 1,
              448: 0,
              464: 34603008,
              480: 33554433,
              496: 1024,
              264: 1049600,
              280: 33555457,
              296: 34603009,
              312: 1,
              328: 33554432,
              344: 1048576,
              360: 1025,
              376: 34604032,
              392: 33554433,
              408: 34603008,
              424: 0,
              440: 34604033,
              456: 1049601,
              472: 1024,
              488: 33555456,
              504: 1048577,
            },
            {
              0: 134219808,
              1: 131072,
              2: 134217728,
              3: 32,
              4: 131104,
              5: 134350880,
              6: 134350848,
              7: 2048,
              8: 134348800,
              9: 134219776,
              10: 133120,
              11: 134348832,
              12: 2080,
              13: 0,
              14: 134217760,
              15: 133152,
              2147483648: 2048,
              2147483649: 134350880,
              2147483650: 134219808,
              2147483651: 134217728,
              2147483652: 134348800,
              2147483653: 133120,
              2147483654: 133152,
              2147483655: 32,
              2147483656: 134217760,
              2147483657: 2080,
              2147483658: 131104,
              2147483659: 134350848,
              2147483660: 0,
              2147483661: 134348832,
              2147483662: 134219776,
              2147483663: 131072,
              16: 133152,
              17: 134350848,
              18: 32,
              19: 2048,
              20: 134219776,
              21: 134217760,
              22: 134348832,
              23: 131072,
              24: 0,
              25: 131104,
              26: 134348800,
              27: 134219808,
              28: 134350880,
              29: 133120,
              30: 2080,
              31: 134217728,
              2147483664: 131072,
              2147483665: 2048,
              2147483666: 134348832,
              2147483667: 133152,
              2147483668: 32,
              2147483669: 134348800,
              2147483670: 134217728,
              2147483671: 134219808,
              2147483672: 134350880,
              2147483673: 134217760,
              2147483674: 134219776,
              2147483675: 0,
              2147483676: 133120,
              2147483677: 2080,
              2147483678: 131104,
              2147483679: 134350848,
            },
          ],
          l = [
            4160749569, 528482304, 33030144, 2064384, 129024, 8064, 504,
            2147483679,
          ],
          u = (n.DES = s.extend({
            _doReset: function () {
              for (var m = this._key, w = m.words, g = [], y = 0; y < 56; y++) {
                var v = o[y] - 1
                g[y] = (w[v >>> 5] >>> (31 - (v % 32))) & 1
              }
              for (var x = (this._subKeys = []), _ = 0; _ < 16; _++) {
                for (var b = (x[_] = []), S = c[_], y = 0; y < 24; y++)
                  ((b[(y / 6) | 0] |= g[(a[y] - 1 + S) % 28] << (31 - (y % 6))),
                    (b[4 + ((y / 6) | 0)] |=
                      g[28 + ((a[y + 24] - 1 + S) % 28)] << (31 - (y % 6))))
                b[0] = (b[0] << 1) | (b[0] >>> 31)
                for (var y = 1; y < 7; y++) b[y] = b[y] >>> ((y - 1) * 4 + 3)
                b[7] = (b[7] << 5) | (b[7] >>> 27)
              }
              for (var A = (this._invSubKeys = []), y = 0; y < 16; y++)
                A[y] = x[15 - y]
            },
            encryptBlock: function (m, w) {
              this._doCryptBlock(m, w, this._subKeys)
            },
            decryptBlock: function (m, w) {
              this._doCryptBlock(m, w, this._invSubKeys)
            },
            _doCryptBlock: function (m, w, g) {
              ;((this._lBlock = m[w]),
                (this._rBlock = m[w + 1]),
                f.call(this, 4, 252645135),
                f.call(this, 16, 65535),
                p.call(this, 2, 858993459),
                p.call(this, 8, 16711935),
                f.call(this, 1, 1431655765))
              for (var y = 0; y < 16; y++) {
                for (
                  var v = g[y],
                    x = this._lBlock,
                    _ = this._rBlock,
                    b = 0,
                    S = 0;
                  S < 8;
                  S++
                )
                  b |= d[S][((_ ^ v[S]) & l[S]) >>> 0]
                ;((this._lBlock = _), (this._rBlock = x ^ b))
              }
              var A = this._lBlock
              ;((this._lBlock = this._rBlock),
                (this._rBlock = A),
                f.call(this, 1, 1431655765),
                p.call(this, 8, 16711935),
                p.call(this, 2, 858993459),
                f.call(this, 16, 65535),
                f.call(this, 4, 252645135),
                (m[w] = this._lBlock),
                (m[w + 1] = this._rBlock))
            },
            keySize: 64 / 32,
            ivSize: 64 / 32,
            blockSize: 64 / 32,
          }))
        function f(m, w) {
          var g = ((this._lBlock >>> m) ^ this._rBlock) & w
          ;((this._rBlock ^= g), (this._lBlock ^= g << m))
        }
        function p(m, w) {
          var g = ((this._rBlock >>> m) ^ this._lBlock) & w
          ;((this._lBlock ^= g), (this._rBlock ^= g << m))
        }
        e.DES = s._createHelper(u)
        var h = (n.TripleDES = s.extend({
          _doReset: function () {
            var m = this._key,
              w = m.words
            if (w.length !== 2 && w.length !== 4 && w.length < 6)
              throw new Error(
                "Invalid key length - 3DES requires the key length to be 64, 128, 192 or >192.",
              )
            var g = w.slice(0, 2),
              y = w.length < 4 ? w.slice(0, 2) : w.slice(2, 4),
              v = w.length < 6 ? w.slice(0, 2) : w.slice(4, 6)
            ;((this._des1 = u.createEncryptor(i.create(g))),
              (this._des2 = u.createEncryptor(i.create(y))),
              (this._des3 = u.createEncryptor(i.create(v))))
          },
          encryptBlock: function (m, w) {
            ;(this._des1.encryptBlock(m, w),
              this._des2.decryptBlock(m, w),
              this._des3.encryptBlock(m, w))
          },
          decryptBlock: function (m, w) {
            ;(this._des3.decryptBlock(m, w),
              this._des2.encryptBlock(m, w),
              this._des1.decryptBlock(m, w))
          },
          keySize: 192 / 32,
          ivSize: 64 / 32,
          blockSize: 64 / 32,
        }))
        e.TripleDES = s._createHelper(h)
      })(),
      r.TripleDES
    )
  })
})
var $d = H((hs, Od) => {
  ;(function (r, e, t) {
    typeof hs == "object"
      ? (Od.exports = hs = e(K(), ut(), ft(), Ye(), le()))
      : typeof define == "function" && define.amd
        ? define(
            ["./core", "./enc-base64", "./md5", "./evpkdf", "./cipher-core"],
            e,
          )
        : e(r.CryptoJS)
  })(hs, function (r) {
    return (
      (function () {
        var e = r,
          t = e.lib,
          i = t.StreamCipher,
          s = e.algo,
          n = (s.RC4 = i.extend({
            _doReset: function () {
              for (
                var c = this._key,
                  d = c.words,
                  l = c.sigBytes,
                  u = (this._S = []),
                  f = 0;
                f < 256;
                f++
              )
                u[f] = f
              for (var f = 0, p = 0; f < 256; f++) {
                var h = f % l,
                  m = (d[h >>> 2] >>> (24 - (h % 4) * 8)) & 255
                p = (p + u[f] + m) % 256
                var w = u[f]
                ;((u[f] = u[p]), (u[p] = w))
              }
              this._i = this._j = 0
            },
            _doProcessBlock: function (c, d) {
              c[d] ^= o.call(this)
            },
            keySize: 256 / 32,
            ivSize: 0,
          }))
        function o() {
          for (
            var c = this._S, d = this._i, l = this._j, u = 0, f = 0;
            f < 4;
            f++
          ) {
            ;((d = (d + 1) % 256), (l = (l + c[d]) % 256))
            var p = c[d]
            ;((c[d] = c[l]),
              (c[l] = p),
              (u |= c[(c[d] + c[l]) % 256] << (24 - f * 8)))
          }
          return ((this._i = d), (this._j = l), u)
        }
        e.RC4 = i._createHelper(n)
        var a = (s.RC4Drop = n.extend({
          cfg: n.cfg.extend({ drop: 192 }),
          _doReset: function () {
            n._doReset.call(this)
            for (var c = this.cfg.drop; c > 0; c--) o.call(this)
          },
        }))
        e.RC4Drop = i._createHelper(a)
      })(),
      r.RC4
    )
  })
})
var zd = H((gs, jd) => {
  ;(function (r, e, t) {
    typeof gs == "object"
      ? (jd.exports = gs = e(K(), ut(), ft(), Ye(), le()))
      : typeof define == "function" && define.amd
        ? define(
            ["./core", "./enc-base64", "./md5", "./evpkdf", "./cipher-core"],
            e,
          )
        : e(r.CryptoJS)
  })(gs, function (r) {
    return (
      (function () {
        var e = r,
          t = e.lib,
          i = t.StreamCipher,
          s = e.algo,
          n = [],
          o = [],
          a = [],
          c = (s.Rabbit = i.extend({
            _doReset: function () {
              for (var l = this._key.words, u = this.cfg.iv, f = 0; f < 4; f++)
                l[f] =
                  (((l[f] << 8) | (l[f] >>> 24)) & 16711935) |
                  (((l[f] << 24) | (l[f] >>> 8)) & 4278255360)
              var p = (this._X = [
                  l[0],
                  (l[3] << 16) | (l[2] >>> 16),
                  l[1],
                  (l[0] << 16) | (l[3] >>> 16),
                  l[2],
                  (l[1] << 16) | (l[0] >>> 16),
                  l[3],
                  (l[2] << 16) | (l[1] >>> 16),
                ]),
                h = (this._C = [
                  (l[2] << 16) | (l[2] >>> 16),
                  (l[0] & 4294901760) | (l[1] & 65535),
                  (l[3] << 16) | (l[3] >>> 16),
                  (l[1] & 4294901760) | (l[2] & 65535),
                  (l[0] << 16) | (l[0] >>> 16),
                  (l[2] & 4294901760) | (l[3] & 65535),
                  (l[1] << 16) | (l[1] >>> 16),
                  (l[3] & 4294901760) | (l[0] & 65535),
                ])
              this._b = 0
              for (var f = 0; f < 4; f++) d.call(this)
              for (var f = 0; f < 8; f++) h[f] ^= p[(f + 4) & 7]
              if (u) {
                var m = u.words,
                  w = m[0],
                  g = m[1],
                  y =
                    (((w << 8) | (w >>> 24)) & 16711935) |
                    (((w << 24) | (w >>> 8)) & 4278255360),
                  v =
                    (((g << 8) | (g >>> 24)) & 16711935) |
                    (((g << 24) | (g >>> 8)) & 4278255360),
                  x = (y >>> 16) | (v & 4294901760),
                  _ = (v << 16) | (y & 65535)
                ;((h[0] ^= y),
                  (h[1] ^= x),
                  (h[2] ^= v),
                  (h[3] ^= _),
                  (h[4] ^= y),
                  (h[5] ^= x),
                  (h[6] ^= v),
                  (h[7] ^= _))
                for (var f = 0; f < 4; f++) d.call(this)
              }
            },
            _doProcessBlock: function (l, u) {
              var f = this._X
              ;(d.call(this),
                (n[0] = f[0] ^ (f[5] >>> 16) ^ (f[3] << 16)),
                (n[1] = f[2] ^ (f[7] >>> 16) ^ (f[5] << 16)),
                (n[2] = f[4] ^ (f[1] >>> 16) ^ (f[7] << 16)),
                (n[3] = f[6] ^ (f[3] >>> 16) ^ (f[1] << 16)))
              for (var p = 0; p < 4; p++)
                ((n[p] =
                  (((n[p] << 8) | (n[p] >>> 24)) & 16711935) |
                  (((n[p] << 24) | (n[p] >>> 8)) & 4278255360)),
                  (l[u + p] ^= n[p]))
            },
            blockSize: 128 / 32,
            ivSize: 64 / 32,
          }))
        function d() {
          for (var l = this._X, u = this._C, f = 0; f < 8; f++) o[f] = u[f]
          ;((u[0] = (u[0] + 1295307597 + this._b) | 0),
            (u[1] =
              (u[1] + 3545052371 + (u[0] >>> 0 < o[0] >>> 0 ? 1 : 0)) | 0),
            (u[2] = (u[2] + 886263092 + (u[1] >>> 0 < o[1] >>> 0 ? 1 : 0)) | 0),
            (u[3] =
              (u[3] + 1295307597 + (u[2] >>> 0 < o[2] >>> 0 ? 1 : 0)) | 0),
            (u[4] =
              (u[4] + 3545052371 + (u[3] >>> 0 < o[3] >>> 0 ? 1 : 0)) | 0),
            (u[5] = (u[5] + 886263092 + (u[4] >>> 0 < o[4] >>> 0 ? 1 : 0)) | 0),
            (u[6] =
              (u[6] + 1295307597 + (u[5] >>> 0 < o[5] >>> 0 ? 1 : 0)) | 0),
            (u[7] =
              (u[7] + 3545052371 + (u[6] >>> 0 < o[6] >>> 0 ? 1 : 0)) | 0),
            (this._b = u[7] >>> 0 < o[7] >>> 0 ? 1 : 0))
          for (var f = 0; f < 8; f++) {
            var p = l[f] + u[f],
              h = p & 65535,
              m = p >>> 16,
              w = ((((h * h) >>> 17) + h * m) >>> 15) + m * m,
              g = (((p & 4294901760) * p) | 0) + (((p & 65535) * p) | 0)
            a[f] = w ^ g
          }
          ;((l[0] =
            (a[0] +
              ((a[7] << 16) | (a[7] >>> 16)) +
              ((a[6] << 16) | (a[6] >>> 16))) |
            0),
            (l[1] = (a[1] + ((a[0] << 8) | (a[0] >>> 24)) + a[7]) | 0),
            (l[2] =
              (a[2] +
                ((a[1] << 16) | (a[1] >>> 16)) +
                ((a[0] << 16) | (a[0] >>> 16))) |
              0),
            (l[3] = (a[3] + ((a[2] << 8) | (a[2] >>> 24)) + a[1]) | 0),
            (l[4] =
              (a[4] +
                ((a[3] << 16) | (a[3] >>> 16)) +
                ((a[2] << 16) | (a[2] >>> 16))) |
              0),
            (l[5] = (a[5] + ((a[4] << 8) | (a[4] >>> 24)) + a[3]) | 0),
            (l[6] =
              (a[6] +
                ((a[5] << 16) | (a[5] >>> 16)) +
                ((a[4] << 16) | (a[4] >>> 16))) |
              0),
            (l[7] = (a[7] + ((a[6] << 8) | (a[6] >>> 24)) + a[5]) | 0))
        }
        e.Rabbit = i._createHelper(c)
      })(),
      r.Rabbit
    )
  })
})
var Nd = H((ms, Ld) => {
  ;(function (r, e, t) {
    typeof ms == "object"
      ? (Ld.exports = ms = e(K(), ut(), ft(), Ye(), le()))
      : typeof define == "function" && define.amd
        ? define(
            ["./core", "./enc-base64", "./md5", "./evpkdf", "./cipher-core"],
            e,
          )
        : e(r.CryptoJS)
  })(ms, function (r) {
    return (
      (function () {
        var e = r,
          t = e.lib,
          i = t.StreamCipher,
          s = e.algo,
          n = [],
          o = [],
          a = [],
          c = (s.RabbitLegacy = i.extend({
            _doReset: function () {
              var l = this._key.words,
                u = this.cfg.iv,
                f = (this._X = [
                  l[0],
                  (l[3] << 16) | (l[2] >>> 16),
                  l[1],
                  (l[0] << 16) | (l[3] >>> 16),
                  l[2],
                  (l[1] << 16) | (l[0] >>> 16),
                  l[3],
                  (l[2] << 16) | (l[1] >>> 16),
                ]),
                p = (this._C = [
                  (l[2] << 16) | (l[2] >>> 16),
                  (l[0] & 4294901760) | (l[1] & 65535),
                  (l[3] << 16) | (l[3] >>> 16),
                  (l[1] & 4294901760) | (l[2] & 65535),
                  (l[0] << 16) | (l[0] >>> 16),
                  (l[2] & 4294901760) | (l[3] & 65535),
                  (l[1] << 16) | (l[1] >>> 16),
                  (l[3] & 4294901760) | (l[0] & 65535),
                ])
              this._b = 0
              for (var h = 0; h < 4; h++) d.call(this)
              for (var h = 0; h < 8; h++) p[h] ^= f[(h + 4) & 7]
              if (u) {
                var m = u.words,
                  w = m[0],
                  g = m[1],
                  y =
                    (((w << 8) | (w >>> 24)) & 16711935) |
                    (((w << 24) | (w >>> 8)) & 4278255360),
                  v =
                    (((g << 8) | (g >>> 24)) & 16711935) |
                    (((g << 24) | (g >>> 8)) & 4278255360),
                  x = (y >>> 16) | (v & 4294901760),
                  _ = (v << 16) | (y & 65535)
                ;((p[0] ^= y),
                  (p[1] ^= x),
                  (p[2] ^= v),
                  (p[3] ^= _),
                  (p[4] ^= y),
                  (p[5] ^= x),
                  (p[6] ^= v),
                  (p[7] ^= _))
                for (var h = 0; h < 4; h++) d.call(this)
              }
            },
            _doProcessBlock: function (l, u) {
              var f = this._X
              ;(d.call(this),
                (n[0] = f[0] ^ (f[5] >>> 16) ^ (f[3] << 16)),
                (n[1] = f[2] ^ (f[7] >>> 16) ^ (f[5] << 16)),
                (n[2] = f[4] ^ (f[1] >>> 16) ^ (f[7] << 16)),
                (n[3] = f[6] ^ (f[3] >>> 16) ^ (f[1] << 16)))
              for (var p = 0; p < 4; p++)
                ((n[p] =
                  (((n[p] << 8) | (n[p] >>> 24)) & 16711935) |
                  (((n[p] << 24) | (n[p] >>> 8)) & 4278255360)),
                  (l[u + p] ^= n[p]))
            },
            blockSize: 128 / 32,
            ivSize: 64 / 32,
          }))
        function d() {
          for (var l = this._X, u = this._C, f = 0; f < 8; f++) o[f] = u[f]
          ;((u[0] = (u[0] + 1295307597 + this._b) | 0),
            (u[1] =
              (u[1] + 3545052371 + (u[0] >>> 0 < o[0] >>> 0 ? 1 : 0)) | 0),
            (u[2] = (u[2] + 886263092 + (u[1] >>> 0 < o[1] >>> 0 ? 1 : 0)) | 0),
            (u[3] =
              (u[3] + 1295307597 + (u[2] >>> 0 < o[2] >>> 0 ? 1 : 0)) | 0),
            (u[4] =
              (u[4] + 3545052371 + (u[3] >>> 0 < o[3] >>> 0 ? 1 : 0)) | 0),
            (u[5] = (u[5] + 886263092 + (u[4] >>> 0 < o[4] >>> 0 ? 1 : 0)) | 0),
            (u[6] =
              (u[6] + 1295307597 + (u[5] >>> 0 < o[5] >>> 0 ? 1 : 0)) | 0),
            (u[7] =
              (u[7] + 3545052371 + (u[6] >>> 0 < o[6] >>> 0 ? 1 : 0)) | 0),
            (this._b = u[7] >>> 0 < o[7] >>> 0 ? 1 : 0))
          for (var f = 0; f < 8; f++) {
            var p = l[f] + u[f],
              h = p & 65535,
              m = p >>> 16,
              w = ((((h * h) >>> 17) + h * m) >>> 15) + m * m,
              g = (((p & 4294901760) * p) | 0) + (((p & 65535) * p) | 0)
            a[f] = w ^ g
          }
          ;((l[0] =
            (a[0] +
              ((a[7] << 16) | (a[7] >>> 16)) +
              ((a[6] << 16) | (a[6] >>> 16))) |
            0),
            (l[1] = (a[1] + ((a[0] << 8) | (a[0] >>> 24)) + a[7]) | 0),
            (l[2] =
              (a[2] +
                ((a[1] << 16) | (a[1] >>> 16)) +
                ((a[0] << 16) | (a[0] >>> 16))) |
              0),
            (l[3] = (a[3] + ((a[2] << 8) | (a[2] >>> 24)) + a[1]) | 0),
            (l[4] =
              (a[4] +
                ((a[3] << 16) | (a[3] >>> 16)) +
                ((a[2] << 16) | (a[2] >>> 16))) |
              0),
            (l[5] = (a[5] + ((a[4] << 8) | (a[4] >>> 24)) + a[3]) | 0),
            (l[6] =
              (a[6] +
                ((a[5] << 16) | (a[5] >>> 16)) +
                ((a[4] << 16) | (a[4] >>> 16))) |
              0),
            (l[7] = (a[7] + ((a[6] << 8) | (a[6] >>> 24)) + a[5]) | 0))
        }
        e.RabbitLegacy = i._createHelper(c)
      })(),
      r.RabbitLegacy
    )
  })
})
var Hd = H((ys, Md) => {
  ;(function (r, e, t) {
    typeof ys == "object"
      ? (Md.exports = ys = e(K(), ut(), ft(), Ye(), le()))
      : typeof define == "function" && define.amd
        ? define(
            ["./core", "./enc-base64", "./md5", "./evpkdf", "./cipher-core"],
            e,
          )
        : e(r.CryptoJS)
  })(ys, function (r) {
    return (
      (function () {
        var e = r,
          t = e.lib,
          i = t.BlockCipher,
          s = e.algo
        let n = 16,
          o = [
            608135816, 2242054355, 320440878, 57701188, 2752067618, 698298832,
            137296536, 3964562569, 1160258022, 953160567, 3193202383, 887688300,
            3232508343, 3380367581, 1065670069, 3041331479, 2450970073,
            2306472731,
          ],
          a = [
            [
              3509652390, 2564797868, 805139163, 3491422135, 3101798381,
              1780907670, 3128725573, 4046225305, 614570311, 3012652279,
              134345442, 2240740374, 1667834072, 1901547113, 2757295779,
              4103290238, 227898511, 1921955416, 1904987480, 2182433518,
              2069144605, 3260701109, 2620446009, 720527379, 3318853667,
              677414384, 3393288472, 3101374703, 2390351024, 1614419982,
              1822297739, 2954791486, 3608508353, 3174124327, 2024746970,
              1432378464, 3864339955, 2857741204, 1464375394, 1676153920,
              1439316330, 715854006, 3033291828, 289532110, 2706671279,
              2087905683, 3018724369, 1668267050, 732546397, 1947742710,
              3462151702, 2609353502, 2950085171, 1814351708, 2050118529,
              680887927, 999245976, 1800124847, 3300911131, 1713906067,
              1641548236, 4213287313, 1216130144, 1575780402, 4018429277,
              3917837745, 3693486850, 3949271944, 596196993, 3549867205,
              258830323, 2213823033, 772490370, 2760122372, 1774776394,
              2652871518, 566650946, 4142492826, 1728879713, 2882767088,
              1783734482, 3629395816, 2517608232, 2874225571, 1861159788,
              326777828, 3124490320, 2130389656, 2716951837, 967770486,
              1724537150, 2185432712, 2364442137, 1164943284, 2105845187,
              998989502, 3765401048, 2244026483, 1075463327, 1455516326,
              1322494562, 910128902, 469688178, 1117454909, 936433444,
              3490320968, 3675253459, 1240580251, 122909385, 2157517691,
              634681816, 4142456567, 3825094682, 3061402683, 2540495037,
              79693498, 3249098678, 1084186820, 1583128258, 426386531,
              1761308591, 1047286709, 322548459, 995290223, 1845252383,
              2603652396, 3431023940, 2942221577, 3202600964, 3727903485,
              1712269319, 422464435, 3234572375, 1170764815, 3523960633,
              3117677531, 1434042557, 442511882, 3600875718, 1076654713,
              1738483198, 4213154764, 2393238008, 3677496056, 1014306527,
              4251020053, 793779912, 2902807211, 842905082, 4246964064,
              1395751752, 1040244610, 2656851899, 3396308128, 445077038,
              3742853595, 3577915638, 679411651, 2892444358, 2354009459,
              1767581616, 3150600392, 3791627101, 3102740896, 284835224,
              4246832056, 1258075500, 768725851, 2589189241, 3069724005,
              3532540348, 1274779536, 3789419226, 2764799539, 1660621633,
              3471099624, 4011903706, 913787905, 3497959166, 737222580,
              2514213453, 2928710040, 3937242737, 1804850592, 3499020752,
              2949064160, 2386320175, 2390070455, 2415321851, 4061277028,
              2290661394, 2416832540, 1336762016, 1754252060, 3520065937,
              3014181293, 791618072, 3188594551, 3933548030, 2332172193,
              3852520463, 3043980520, 413987798, 3465142937, 3030929376,
              4245938359, 2093235073, 3534596313, 375366246, 2157278981,
              2479649556, 555357303, 3870105701, 2008414854, 3344188149,
              4221384143, 3956125452, 2067696032, 3594591187, 2921233993,
              2428461, 544322398, 577241275, 1471733935, 610547355, 4027169054,
              1432588573, 1507829418, 2025931657, 3646575487, 545086370,
              48609733, 2200306550, 1653985193, 298326376, 1316178497,
              3007786442, 2064951626, 458293330, 2589141269, 3591329599,
              3164325604, 727753846, 2179363840, 146436021, 1461446943,
              4069977195, 705550613, 3059967265, 3887724982, 4281599278,
              3313849956, 1404054877, 2845806497, 146425753, 1854211946,
            ],
            [
              1266315497, 3048417604, 3681880366, 3289982499, 290971e4,
              1235738493, 2632868024, 2414719590, 3970600049, 1771706367,
              1449415276, 3266420449, 422970021, 1963543593, 2690192192,
              3826793022, 1062508698, 1531092325, 1804592342, 2583117782,
              2714934279, 4024971509, 1294809318, 4028980673, 1289560198,
              2221992742, 1669523910, 35572830, 157838143, 1052438473,
              1016535060, 1802137761, 1753167236, 1386275462, 3080475397,
              2857371447, 1040679964, 2145300060, 2390574316, 1461121720,
              2956646967, 4031777805, 4028374788, 33600511, 2920084762,
              1018524850, 629373528, 3691585981, 3515945977, 2091462646,
              2486323059, 586499841, 988145025, 935516892, 3367335476,
              2599673255, 2839830854, 265290510, 3972581182, 2759138881,
              3795373465, 1005194799, 847297441, 406762289, 1314163512,
              1332590856, 1866599683, 4127851711, 750260880, 613907577,
              1450815602, 3165620655, 3734664991, 3650291728, 3012275730,
              3704569646, 1427272223, 778793252, 1343938022, 2676280711,
              2052605720, 1946737175, 3164576444, 3914038668, 3967478842,
              3682934266, 1661551462, 3294938066, 4011595847, 840292616,
              3712170807, 616741398, 312560963, 711312465, 1351876610,
              322626781, 1910503582, 271666773, 2175563734, 1594956187,
              70604529, 3617834859, 1007753275, 1495573769, 4069517037,
              2549218298, 2663038764, 504708206, 2263041392, 3941167025,
              2249088522, 1514023603, 1998579484, 1312622330, 694541497,
              2582060303, 2151582166, 1382467621, 776784248, 2618340202,
              3323268794, 2497899128, 2784771155, 503983604, 4076293799,
              907881277, 423175695, 432175456, 1378068232, 4145222326,
              3954048622, 3938656102, 3820766613, 2793130115, 2977904593,
              26017576, 3274890735, 3194772133, 1700274565, 1756076034,
              4006520079, 3677328699, 720338349, 1533947780, 354530856,
              688349552, 3973924725, 1637815568, 332179504, 3949051286,
              53804574, 2852348879, 3044236432, 1282449977, 3583942155,
              3416972820, 4006381244, 1617046695, 2628476075, 3002303598,
              1686838959, 431878346, 2686675385, 1700445008, 1080580658,
              1009431731, 832498133, 3223435511, 2605976345, 2271191193,
              2516031870, 1648197032, 4164389018, 2548247927, 300782431,
              375919233, 238389289, 3353747414, 2531188641, 2019080857,
              1475708069, 455242339, 2609103871, 448939670, 3451063019,
              1395535956, 2413381860, 1841049896, 1491858159, 885456874,
              4264095073, 4001119347, 1565136089, 3898914787, 1108368660,
              540939232, 1173283510, 2745871338, 3681308437, 4207628240,
              3343053890, 4016749493, 1699691293, 1103962373, 3625875870,
              2256883143, 3830138730, 1031889488, 3479347698, 1535977030,
              4236805024, 3251091107, 2132092099, 1774941330, 1199868427,
              1452454533, 157007616, 2904115357, 342012276, 595725824,
              1480756522, 206960106, 497939518, 591360097, 863170706,
              2375253569, 3596610801, 1814182875, 2094937945, 3421402208,
              1082520231, 3463918190, 2785509508, 435703966, 3908032597,
              1641649973, 2842273706, 3305899714, 1510255612, 2148256476,
              2655287854, 3276092548, 4258621189, 236887753, 3681803219,
              274041037, 1734335097, 3815195456, 3317970021, 1899903192,
              1026095262, 4050517792, 356393447, 2410691914, 3873677099,
              3682840055,
            ],
            [
              3913112168, 2491498743, 4132185628, 2489919796, 1091903735,
              1979897079, 3170134830, 3567386728, 3557303409, 857797738,
              1136121015, 1342202287, 507115054, 2535736646, 337727348,
              3213592640, 1301675037, 2528481711, 1895095763, 1721773893,
              3216771564, 62756741, 2142006736, 835421444, 2531993523,
              1442658625, 3659876326, 2882144922, 676362277, 1392781812,
              170690266, 3921047035, 1759253602, 3611846912, 1745797284,
              664899054, 1329594018, 3901205900, 3045908486, 2062866102,
              2865634940, 3543621612, 3464012697, 1080764994, 553557557,
              3656615353, 3996768171, 991055499, 499776247, 1265440854,
              648242737, 3940784050, 980351604, 3713745714, 1749149687,
              3396870395, 4211799374, 3640570775, 1161844396, 3125318951,
              1431517754, 545492359, 4268468663, 3499529547, 1437099964,
              2702547544, 3433638243, 2581715763, 2787789398, 1060185593,
              1593081372, 2418618748, 4260947970, 69676912, 2159744348,
              86519011, 2512459080, 3838209314, 1220612927, 3339683548,
              133810670, 1090789135, 1078426020, 1569222167, 845107691,
              3583754449, 4072456591, 1091646820, 628848692, 1613405280,
              3757631651, 526609435, 236106946, 48312990, 2942717905,
              3402727701, 1797494240, 859738849, 992217954, 4005476642,
              2243076622, 3870952857, 3732016268, 765654824, 3490871365,
              2511836413, 1685915746, 3888969200, 1414112111, 2273134842,
              3281911079, 4080962846, 172450625, 2569994100, 980381355,
              4109958455, 2819808352, 2716589560, 2568741196, 3681446669,
              3329971472, 1835478071, 660984891, 3704678404, 4045999559,
              3422617507, 3040415634, 1762651403, 1719377915, 3470491036,
              2693910283, 3642056355, 3138596744, 1364962596, 2073328063,
              1983633131, 926494387, 3423689081, 2150032023, 4096667949,
              1749200295, 3328846651, 309677260, 2016342300, 1779581495,
              3079819751, 111262694, 1274766160, 443224088, 298511866,
              1025883608, 3806446537, 1145181785, 168956806, 3641502830,
              3584813610, 1689216846, 3666258015, 3200248200, 1692713982,
              2646376535, 4042768518, 1618508792, 1610833997, 3523052358,
              4130873264, 2001055236, 3610705100, 2202168115, 4028541809,
              2961195399, 1006657119, 2006996926, 3186142756, 1430667929,
              3210227297, 1314452623, 4074634658, 4101304120, 2273951170,
              1399257539, 3367210612, 3027628629, 1190975929, 2062231137,
              2333990788, 2221543033, 2438960610, 1181637006, 548689776,
              2362791313, 3372408396, 3104550113, 3145860560, 296247880,
              1970579870, 3078560182, 3769228297, 1714227617, 3291629107,
              3898220290, 166772364, 1251581989, 493813264, 448347421,
              195405023, 2709975567, 677966185, 3703036547, 1463355134,
              2715995803, 1338867538, 1343315457, 2802222074, 2684532164,
              233230375, 2599980071, 2000651841, 3277868038, 1638401717,
              4028070440, 3237316320, 6314154, 819756386, 300326615, 590932579,
              1405279636, 3267499572, 3150704214, 2428286686, 3959192993,
              3461946742, 1862657033, 1266418056, 963775037, 2089974820,
              2263052895, 1917689273, 448879540, 3550394620, 3981727096,
              150775221, 3627908307, 1303187396, 508620638, 2975983352,
              2726630617, 1817252668, 1876281319, 1457606340, 908771278,
              3720792119, 3617206836, 2455994898, 1729034894, 1080033504,
            ],
            [
              976866871, 3556439503, 2881648439, 1522871579, 1555064734,
              1336096578, 3548522304, 2579274686, 3574697629, 3205460757,
              3593280638, 3338716283, 3079412587, 564236357, 2993598910,
              1781952180, 1464380207, 3163844217, 3332601554, 1699332808,
              1393555694, 1183702653, 3581086237, 1288719814, 691649499,
              2847557200, 2895455976, 3193889540, 2717570544, 1781354906,
              1676643554, 2592534050, 3230253752, 1126444790, 2770207658,
              2633158820, 2210423226, 2615765581, 2414155088, 3127139286,
              673620729, 2805611233, 1269405062, 4015350505, 3341807571,
              4149409754, 1057255273, 2012875353, 2162469141, 2276492801,
              2601117357, 993977747, 3918593370, 2654263191, 753973209,
              36408145, 2530585658, 25011837, 3520020182, 2088578344, 530523599,
              2918365339, 1524020338, 1518925132, 3760827505, 3759777254,
              1202760957, 3985898139, 3906192525, 674977740, 4174734889,
              2031300136, 2019492241, 3983892565, 4153806404, 3822280332,
              352677332, 2297720250, 60907813, 90501309, 3286998549, 1016092578,
              2535922412, 2839152426, 457141659, 509813237, 4120667899,
              652014361, 1966332200, 2975202805, 55981186, 2327461051,
              676427537, 3255491064, 2882294119, 3433927263, 1307055953,
              942726286, 933058658, 2468411793, 3933900994, 4215176142,
              1361170020, 2001714738, 2830558078, 3274259782, 1222529897,
              1679025792, 2729314320, 3714953764, 1770335741, 151462246,
              3013232138, 1682292957, 1483529935, 471910574, 1539241949,
              458788160, 3436315007, 1807016891, 3718408830, 978976581,
              1043663428, 3165965781, 1927990952, 4200891579, 2372276910,
              3208408903, 3533431907, 1412390302, 2931980059, 4132332400,
              1947078029, 3881505623, 4168226417, 2941484381, 1077988104,
              1320477388, 886195818, 18198404, 3786409e3, 2509781533, 112762804,
              3463356488, 1866414978, 891333506, 18488651, 661792760,
              1628790961, 3885187036, 3141171499, 876946877, 2693282273,
              1372485963, 791857591, 2686433993, 3759982718, 3167212022,
              3472953795, 2716379847, 445679433, 3561995674, 3504004811,
              3574258232, 54117162, 3331405415, 2381918588, 3769707343,
              4154350007, 1140177722, 4074052095, 668550556, 3214352940,
              367459370, 261225585, 2610173221, 4209349473, 3468074219,
              3265815641, 314222801, 3066103646, 3808782860, 282218597,
              3406013506, 3773591054, 379116347, 1285071038, 846784868,
              2669647154, 3771962079, 3550491691, 2305946142, 453669953,
              1268987020, 3317592352, 3279303384, 3744833421, 2610507566,
              3859509063, 266596637, 3847019092, 517658769, 3462560207,
              3443424879, 370717030, 4247526661, 2224018117, 4143653529,
              4112773975, 2788324899, 2477274417, 1456262402, 2901442914,
              1517677493, 1846949527, 2295493580, 3734397586, 2176403920,
              1280348187, 1908823572, 3871786941, 846861322, 1172426758,
              3287448474, 3383383037, 1655181056, 3139813346, 901632758,
              1897031941, 2986607138, 3066810236, 3447102507, 1393639104,
              373351379, 950779232, 625454576, 3124240540, 4148612726,
              2007998917, 544563296, 2244738638, 2330496472, 2058025392,
              1291430526, 424198748, 50039436, 29584100, 3605783033, 2429876329,
              2791104160, 1057563949, 3255363231, 3075367218, 3463963227,
              1469046755, 985887462,
            ],
          ]
        var c = { pbox: [], sbox: [] }
        function d(h, m) {
          let w = (m >> 24) & 255,
            g = (m >> 16) & 255,
            y = (m >> 8) & 255,
            v = m & 255,
            x = h.sbox[0][w] + h.sbox[1][g]
          return ((x = x ^ h.sbox[2][y]), (x = x + h.sbox[3][v]), x)
        }
        function l(h, m, w) {
          let g = m,
            y = w,
            v
          for (let x = 0; x < n; ++x)
            ((g = g ^ h.pbox[x]), (y = d(h, g) ^ y), (v = g), (g = y), (y = v))
          return (
            (v = g),
            (g = y),
            (y = v),
            (y = y ^ h.pbox[n]),
            (g = g ^ h.pbox[n + 1]),
            { left: g, right: y }
          )
        }
        function u(h, m, w) {
          let g = m,
            y = w,
            v
          for (let x = n + 1; x > 1; --x)
            ((g = g ^ h.pbox[x]), (y = d(h, g) ^ y), (v = g), (g = y), (y = v))
          return (
            (v = g),
            (g = y),
            (y = v),
            (y = y ^ h.pbox[1]),
            (g = g ^ h.pbox[0]),
            { left: g, right: y }
          )
        }
        function f(h, m, w) {
          for (let _ = 0; _ < 4; _++) {
            h.sbox[_] = []
            for (let b = 0; b < 256; b++) h.sbox[_][b] = a[_][b]
          }
          let g = 0
          for (let _ = 0; _ < n + 2; _++)
            ((h.pbox[_] = o[_] ^ m[g]), g++, g >= w && (g = 0))
          let y = 0,
            v = 0,
            x = 0
          for (let _ = 0; _ < n + 2; _ += 2)
            ((x = l(h, y, v)),
              (y = x.left),
              (v = x.right),
              (h.pbox[_] = y),
              (h.pbox[_ + 1] = v))
          for (let _ = 0; _ < 4; _++)
            for (let b = 0; b < 256; b += 2)
              ((x = l(h, y, v)),
                (y = x.left),
                (v = x.right),
                (h.sbox[_][b] = y),
                (h.sbox[_][b + 1] = v))
          return !0
        }
        var p = (s.Blowfish = i.extend({
          _doReset: function () {
            if (this._keyPriorReset !== this._key) {
              var h = (this._keyPriorReset = this._key),
                m = h.words,
                w = h.sigBytes / 4
              f(c, m, w)
            }
          },
          encryptBlock: function (h, m) {
            var w = l(c, h[m], h[m + 1])
            ;((h[m] = w.left), (h[m + 1] = w.right))
          },
          decryptBlock: function (h, m) {
            var w = u(c, h[m], h[m + 1])
            ;((h[m] = w.left), (h[m + 1] = w.right))
          },
          blockSize: 64 / 32,
          keySize: 128 / 32,
          ivSize: 64 / 32,
        }))
        e.Blowfish = i._createHelper(p)
      })(),
      r.Blowfish
    )
  })
})
var Dr = H((ws, Kd) => {
  ;(function (r, e, t) {
    typeof ws == "object"
      ? (Kd.exports = ws =
          e(
            K(),
            Er(),
            Nc(),
            Hc(),
            ut(),
            Gc(),
            ft(),
            Ln(),
            Hi(),
            Yc(),
            Nn(),
            td(),
            id(),
            nd(),
            Xi(),
            cd(),
            Ye(),
            le(),
            fd(),
            hd(),
            md(),
            wd(),
            _d(),
            bd(),
            Sd(),
            Ad(),
            Ed(),
            Fd(),
            Id(),
            Rd(),
            qd(),
            $d(),
            zd(),
            Nd(),
            Hd(),
          ))
      : typeof define == "function" && define.amd
        ? define(
            [
              "./core",
              "./x64-core",
              "./lib-typedarrays",
              "./enc-utf16",
              "./enc-base64",
              "./enc-base64url",
              "./md5",
              "./sha1",
              "./sha256",
              "./sha224",
              "./sha512",
              "./sha384",
              "./sha3",
              "./ripemd160",
              "./hmac",
              "./pbkdf2",
              "./evpkdf",
              "./cipher-core",
              "./mode-cfb",
              "./mode-ctr",
              "./mode-ctr-gladman",
              "./mode-ofb",
              "./mode-ecb",
              "./pad-ansix923",
              "./pad-iso10126",
              "./pad-iso97971",
              "./pad-zeropadding",
              "./pad-nopadding",
              "./format-hex",
              "./aes",
              "./tripledes",
              "./rc4",
              "./rabbit",
              "./rabbit-legacy",
              "./blowfish",
            ],
            e,
          )
        : (r.CryptoJS = e(r.CryptoJS))
  })(ws, function (r) {
    return r
  })
})
var Gl = {}
jt(Gl, { LocalDriver: () => co })
async function gt() {
  if (typeof process < "u" && process.release?.name === "node" && !Z)
    try {
      ;((Z = await import("fs/promises")), (ae = await import("path")))
    } catch {}
}
var Z,
  ae,
  co,
  Vl = N(() => {
    "use strict"
    fe()
    ;((Z = null), (ae = null))
    co = class {
      async list(e, t) {
        if ((await gt(), !Z || !ae))
          throw new Error("LocalDriver is not supported in Edge Runtime")
        let i = []
        try {
          i = await Z.readdir(t, { withFileTypes: !0 })
        } catch {
          return []
        }
        return await Promise.all(
          i.map(async (n) => {
            let o = n.isDirectory(),
              a = 0,
              c = new Date()
            try {
              let d = await Z.stat(ae.join(t, n.name))
              ;((a = d.size), (c = d.mtime))
            } catch {}
            return {
              name: n.name,
              size: o ? 0 : a,
              is_dir: o,
              created: c.toISOString(),
              modified: c.toISOString(),
              sign: "",
              type: L(n.name, o),
            }
          }),
        )
      }
      async get(e, t) {
        if ((await gt(), !Z || !ae))
          throw new Error("LocalDriver is not supported in Edge Runtime")
        let i = await Z.stat(t),
          s = i.isDirectory(),
          n =
            t
              .split(/[\\/]+/)
              .filter(Boolean)
              .pop() || "root"
        return {
          name: n,
          size: s ? 0 : i.size,
          is_dir: s,
          created: i.ctime?.toISOString() || i.mtime.toISOString(),
          modified: i.mtime.toISOString(),
          sign: "",
          type: L(n, s),
        }
      }
      async mkdir(e, t) {
        if ((await gt(), !Z || !ae))
          throw new Error("LocalDriver is not supported in Edge Runtime")
        await Z.mkdir(t, { recursive: !0 })
      }
      async rename(e, t, i) {
        if ((await gt(), !Z || !ae))
          throw new Error("LocalDriver is not supported in Edge Runtime")
        let s = ae.join(ae.dirname(t), i)
        await Z.rename(t, s)
      }
      async remove(e, t, i) {
        if ((await gt(), !Z || !ae))
          throw new Error("LocalDriver is not supported in Edge Runtime")
        for (let s of i) {
          let n = ae.join(t, s)
          await Z.rm(n, { recursive: !0, force: !0 })
        }
      }
      async move(e, t, i, s, n) {
        if ((await gt(), !Z || !ae))
          throw new Error("LocalDriver is not supported in Edge Runtime")
        for (let o of i) {
          let a = ae.join(s, o),
            c = ae.join(n, o)
          ;(await Z.mkdir(ae.dirname(c), { recursive: !0 }),
            await Z.rename(a, c))
        }
      }
      async copy(e, t, i, s, n) {
        if ((await gt(), !Z || !ae))
          throw new Error("LocalDriver is not supported in Edge Runtime")
        for (let o of i) {
          let a = ae.join(s, o),
            c = ae.join(n, o)
          ;(await Z.mkdir(ae.dirname(c), { recursive: !0 }),
            await Z.cp(a, c, { recursive: !0 }))
        }
      }
      async put(e, t, i) {
        if ((await gt(), !Z || !ae))
          throw new Error("LocalDriver is not supported in Edge Runtime")
        ;(await Z.mkdir(ae.dirname(t), { recursive: !0 }),
          await Z.writeFile(t, i))
      }
    }
  })
async function Th() {
  if (typeof process > "u" || process.release?.name !== "node")
    throw new Error(
      "[SFTP] SFTP driver requires Node.js container runtime (raw TCP sockets not available in standard Edge isolates)",
    )
  if (!lo)
    try {
      lo = await import("ssh2")
    } catch (r) {
      throw new Error(`[SFTP] Failed to load ssh2 module: ${r.message}`)
    }
  return lo
}
function Jl(r) {
  let e = (r || "").trim()
  if (!e) return { host: "127.0.0.1", port: 22 }
  if (e.startsWith("[")) {
    let n = e.indexOf("]")
    if (n > 0) {
      let o = e.slice(1, n),
        a = e.slice(n + 1),
        c = a.indexOf(":"),
        d = (c >= 0 && parseInt(a.slice(c + 1), 10)) || 22
      return { host: o, port: d }
    }
  }
  let t = e.split(":")
  if (t.length === 1) return { host: t[0], port: 22 }
  let i = parseInt(t[t.length - 1], 10)
  return isNaN(i)
    ? { host: e, port: 22 }
    : { host: t.slice(0, t.length - 1).join(":"), port: i || 22 }
}
var lo,
  qr,
  uo = N(() => {
    "use strict"
    lo = null
    qr = class {
      addition
      sshClient = null
      sftpClient = null
      connectingPromise = null
      constructor(e) {
        this.addition = e
      }
      async getSFTP() {
        if (this.sftpClient) return this.sftpClient
        if (this.connectingPromise) return this.connectingPromise
        this.connectingPromise = this._connect()
        try {
          return (
            (this.sftpClient = await this.connectingPromise),
            this.sftpClient
          )
        } finally {
          this.connectingPromise = null
        }
      }
      async _connect() {
        let { Client: e } = await Th(),
          { host: t, port: i } = Jl(this.addition.address),
          s = new e(),
          n = {
            host: t,
            port: i,
            username: this.addition.username,
            readyTimeout: 1e4,
            keepaliveInterval: 15e3,
            keepaliveCountMax: 3,
          }
        return (
          this.addition.private_key
            ? ((n.privateKey = this.addition.private_key),
              this.addition.passphrase &&
                (n.passphrase = this.addition.passphrase))
            : this.addition.password && (n.password = this.addition.password),
          new Promise((o, a) => {
            let c = !1
            ;(s.on("ready", () => {
              ;((c = !0),
                s.sftp((d, l) => {
                  if (d) return (s.end(), a(d))
                  ;((this.sshClient = s), o(l))
                }))
            }),
              s.on("error", (d) => {
                ;(c || a(d), this.close())
              }),
              s.on("close", () => {
                this.close()
              }),
              s.on("end", () => {
                this.close()
              }))
            try {
              s.connect(n)
            } catch (d) {
              a(d)
            }
          })
        )
      }
      close() {
        if (this.sftpClient) {
          try {
            this.sftpClient.end()
          } catch {}
          this.sftpClient = null
        }
        if (this.sshClient) {
          try {
            this.sshClient.end()
          } catch {}
          this.sshClient = null
        }
      }
      async readdir(e) {
        let t = await this.getSFTP()
        return new Promise((i, s) => {
          t.readdir(e, (n, o) => {
            if (n) return s(n)
            i(o || [])
          })
        })
      }
      async stat(e) {
        let t = await this.getSFTP()
        return new Promise((i, s) => {
          t.stat(e, (n, o) => {
            if (n) return s(n)
            i(o)
          })
        })
      }
      async lstat(e) {
        let t = await this.getSFTP()
        return new Promise((i, s) => {
          t.lstat(e, (n, o) => {
            if (n) return s(n)
            i(o)
          })
        })
      }
      async readlink(e) {
        let t = await this.getSFTP()
        return new Promise((i, s) => {
          t.readlink(e, (n, o) => {
            if (n) return s(n)
            i(o)
          })
        })
      }
      async realpath(e) {
        let t = await this.getSFTP()
        return new Promise((i, s) => {
          t.realpath(e, (n, o) => {
            if (n) return s(n)
            i(o)
          })
        })
      }
      async mkdir(e) {
        let t = await this.getSFTP()
        return new Promise((i, s) => {
          t.mkdir(e, (n) => {
            if (n) return s(n)
            i()
          })
        })
      }
      async mkdirAll(e) {
        let t = e.replace(/\\/g, "/"),
          i = t.split("/").filter(Boolean),
          s = t.startsWith("/") ? "/" : ""
        for (let n of i) {
          s = s === "/" ? "/" + n : s + "/" + n
          try {
            if (!(await this.stat(s)).isDirectory())
              throw new Error(`[SFTP] Path exists but is not directory: ${s}`)
          } catch {
            try {
              await this.mkdir(s)
            } catch (a) {
              try {
                if ((await this.stat(s)).isDirectory()) continue
              } catch {}
              throw a
            }
          }
        }
      }
      async rename(e, t) {
        let i = await this.getSFTP()
        return new Promise((s, n) => {
          i.rename(e, t, (o) => {
            if (o) return n(o)
            s()
          })
        })
      }
      async unlink(e) {
        let t = await this.getSFTP()
        return new Promise((i, s) => {
          t.unlink(e, (n) => {
            if (n) return s(n)
            i()
          })
        })
      }
      async rmdir(e) {
        let t = await this.getSFTP()
        return new Promise((i, s) => {
          t.rmdir(e, (n) => {
            if (n) return s(n)
            i()
          })
        })
      }
      async removeRecursive(e) {
        let t
        try {
          t = await this.lstat(e)
        } catch {
          return
        }
        if (t.isDirectory()) {
          let i = await this.readdir(e)
          for (let s of i) {
            if (s.filename === "." || s.filename === "..") continue
            let n = `${e.replace(/\/+$/, "")}/${s.filename}`
            await this.removeRecursive(n)
          }
          await this.rmdir(e)
        } else await this.unlink(e)
      }
      async writeFile(e, t) {
        let i = await this.getSFTP()
        return new Promise((s, n) => {
          let o = i.createWriteStream(e)
          ;(o.on("error", n), o.on("finish", s), o.end(t))
        })
      }
      async readFile(e) {
        let t = await this.getSFTP()
        return new Promise((i, s) => {
          let n = t.createReadStream(e),
            o = []
          ;(n.on("data", (a) => o.push(a)),
            n.on("error", s),
            n.on("end", () => i(Buffer.concat(o))))
        })
      }
      async createReadStream(e, t) {
        return (await this.getSFTP()).createReadStream(e, t)
      }
    }
  })
function fo(r) {
  let e = { ...(r || {}) }
  return (
    (e.address = (e.address || "").trim()),
    (e.username = (e.username || "").trim()),
    (e.password = e.password || ""),
    (e.private_key = e.private_key || ""),
    (e.passphrase = e.passphrase || ""),
    (e.root_folder_path = (e.root_folder_path || "/").trim()),
    e.root_folder_path.startsWith("/") ||
      (e.root_folder_path = "/" + e.root_folder_path),
    (e.ignore_symlink_error =
      e.ignore_symlink_error === !0 || e.ignore_symlink_error === "true"),
    e
  )
}
function ze(r) {
  return (
    "/" + (r || "").replace(/\\/g, "/").split("/").filter(Boolean).join("/")
  )
}
function Ql(r) {
  let e = ze(r),
    t = e.lastIndexOf("/")
  return t <= 0 ? "/" : e.slice(0, t)
}
function Ct(...r) {
  let e = r.map((t) => (t || "").replace(/\\/g, "/")).join("/")
  return ze(e)
}
var Ns,
  Xl = N(() => {
    "use strict"
    fe()
    uo()
    Ns = class {
      client
      addition
      constructor(e) {
        ;((this.addition = fo(e)), (this.client = new qr(this.addition)))
      }
      async init() {
        if (!this.addition.address || !this.addition.username)
          throw new Error("[SFTP] address and username are required")
        await this.client.getSFTP()
      }
      async fileToItem(e, t) {
        let i = e.filename
        if (i === "." || i === "..") return null
        let s = Ct(t, i),
          n = e.attrs?.mode || 0,
          o = (n & 61440) === 40960,
          a = (n & 61440) === 16384,
          c = e.attrs?.mtime
            ? new Date(e.attrs.mtime * 1e3).toISOString()
            : new Date().toISOString()
        if (!o)
          return {
            name: i,
            size: a ? 0 : e.attrs?.size || 0,
            is_dir: a,
            modified: c,
            sign: s,
            type: L(i, a),
            raw_url: "",
          }
        try {
          let d = await this.client.readlink(s)
          d.startsWith("/") || (d = Ct(t, d))
          let l = await this.client.stat(d),
            u = l.isDirectory()
          return {
            name: i,
            size: u ? 0 : l.size || 0,
            is_dir: u,
            modified: l.mtime ? new Date(l.mtime * 1e3).toISOString() : c,
            sign: s,
            type: L(i, u),
            raw_url: "",
          }
        } catch (d) {
          if (this.addition.ignore_symlink_error)
            return {
              name: i,
              size: 0,
              is_dir: !1,
              modified: c,
              sign: s,
              type: L(i, !1),
              raw_url: "",
            }
          throw d
        }
      }
      async list(e, t) {
        let i = ze(t || this.addition.root_folder_path || "/"),
          s = await this.client.readdir(i),
          n = []
        for (let o of s) {
          let a = await this.fileToItem(o, i)
          a && n.push(a)
        }
        return n
      }
      async get(e, t) {
        let i = ze(t || this.addition.root_folder_path || "/")
        if (i === "/" || i === ze(this.addition.root_folder_path || "/"))
          return {
            name: "root",
            size: 0,
            is_dir: !0,
            modified: new Date().toISOString(),
            sign: i,
            type: 1,
            raw_url: "",
          }
        let s = await this.client.stat(i),
          n = s.isDirectory(),
          o = i.split("/").filter(Boolean).pop() || "root",
          a = s.mtime
            ? new Date(s.mtime * 1e3).toISOString()
            : new Date().toISOString()
        return {
          name: o,
          size: n ? 0 : s.size || 0,
          is_dir: n,
          modified: a,
          sign: i,
          type: L(o, n),
          raw_url: "",
        }
      }
      async mkdir(e, t) {
        let i = ze(t)
        await this.client.mkdirAll(i)
      }
      async rename(e, t, i) {
        let s = ze(t),
          n = Ct(Ql(s), i)
        await this.client.rename(s, n)
      }
      async remove(e, t, i) {
        let s = ze(t)
        if (i && i.length > 0)
          for (let n of i) await this.client.removeRecursive(Ct(s, n))
        else await this.client.removeRecursive(s)
      }
      async move(e, t, i, s, n) {
        if (i && i.length > 0)
          for (let o of i) {
            let a = Ct(s, o),
              c = Ct(n, o)
            await this.client.rename(a, c)
          }
        else {
          let o = s.split("/").filter(Boolean).pop() || "",
            a = Ct(t, o)
          await this.client.rename(ze(s), a)
        }
      }
      async copy(e, t, i, s, n) {
        throw new Error("[SFTP] Copy not supported")
      }
      async put(e, t, i) {
        let s = ze(t)
        ;(await this.client.mkdirAll(Ql(s)), await this.client.writeFile(s, i))
      }
      async createReadStream(e, t) {
        let i = ze(e)
        return this.client.createReadStream(i, t)
      }
    }
  })
var Yl = N(() => {
  "use strict"
})
var Zl = {}
jt(Zl, {
  SFTPClientWrapper: () => qr,
  SFTPDriver: () => Ns,
  normalizeSFTPAddition: () => fo,
  parseAddress: () => Jl,
})
var eu = N(() => {
  "use strict"
  Xl()
  Yl()
  uo()
})
function Or(r) {
  let e = (r || "").trim().toLowerCase()
  return !e || e === "utf8" || e === "utf-8" ? "utf-8" : e
}
function po(r, e) {
  let t = Or(e)
  if (t === "utf-8") return Buffer.from(r, "utf-8")
  try {
    return Ms ? Ms.encode(r, t) : dr("iconv-lite").encode(r, t)
  } catch {
    return Buffer.from(r, "utf-8")
  }
}
function Hs(r, e) {
  let t = Or(e),
    i = Buffer.isBuffer(r) ? r : Buffer.from(r)
  if (t === "utf-8") return i.toString("utf-8")
  try {
    return Ms ? Ms.decode(i, t) : dr("iconv-lite").decode(i, t)
  } catch {
    return i.toString("utf-8")
  }
}
var Ms,
  ho = N(() => {
    "use strict"
    Ms = null
  })
async function tu() {
  if (typeof process > "u" || process.release?.name !== "node")
    throw new Error(
      "[FTP] FTP driver requires Node.js container runtime (raw TCP sockets not available in standard Edge isolates)",
    )
  if (!go)
    try {
      go = await import("node:net")
    } catch (r) {
      throw new Error(`[FTP] Failed to load net module: ${r.message}`)
    }
  return go
}
async function Ih() {
  if (!mo)
    try {
      mo = await import("node:stream")
    } catch (r) {
      throw new Error(`[FTP] Failed to load stream module: ${r.message}`)
    }
  return mo
}
function ru(r) {
  let e = (r || "").trim()
  if (!e) return { host: "127.0.0.1", port: 21 }
  if (e.startsWith("[")) {
    let n = e.indexOf("]")
    if (n > 0) {
      let o = e.slice(1, n),
        a = e.slice(n + 1),
        c = a.indexOf(":"),
        d = (c >= 0 && parseInt(a.slice(c + 1), 10)) || 21
      return { host: o, port: d }
    }
  }
  let t = e.split(":")
  if (t.length === 1) return { host: t[0], port: 21 }
  let i = parseInt(t[t.length - 1], 10)
  return isNaN(i)
    ? { host: e, port: 21 }
    : { host: t.slice(0, t.length - 1).join(":"), port: i || 21 }
}
function iu(r, e) {
  let t = r.trim()
  if (!t) return null
  if (t.includes("type=") && t.includes(";")) {
    let n = t.split(";"),
      o = n[n.length - 1].trim()
    if (!o || o === "." || o === "..") return null
    let a = !1,
      c = 0,
      d = new Date()
    for (let l of n.slice(0, -1)) {
      let [u, f] = l.split("=").map((p) => p.trim().toLowerCase())
      if (u === "type") a = f === "dir" || f === "cdir" || f === "pdir"
      else if (u === "size") c = parseInt(f, 10) || 0
      else if (u === "modify" && f && f.length >= 14) {
        let p = parseInt(f.slice(0, 4), 10),
          h = parseInt(f.slice(4, 6), 10) - 1,
          m = parseInt(f.slice(6, 8), 10),
          w = parseInt(f.slice(8, 10), 10),
          g = parseInt(f.slice(10, 12), 10),
          y = parseInt(f.slice(12, 14), 10)
        d = new Date(Date.UTC(p, h, m, w, g, y))
      }
    }
    return { name: o, size: c, is_dir: a, modified: d }
  }
  let i = t.match(
    /^([bcdlps-])[rwxstST-]{9}\s+\d+\s+(?:\S+\s+){1,2}(\d+)\s+([A-Za-z]{3}\s+\d{1,2}\s+(?:\d{4}|\d{1,2}:\d{2}))\s+(.+)$/,
  )
  if (i) {
    let n = i[1],
      o = parseInt(i[2], 10) || 0,
      a = i[3],
      c = i[4]
    if (
      (n === "l" && c.includes(" -> ") && (c = c.split(" -> ")[0]),
      c === "." || c === "..")
    )
      return null
    let d = n === "d",
      l = new Date()
    try {
      let u = Date.parse(`${a} UTC`)
      isNaN(u) || (l = new Date(u))
    } catch {}
    return { name: c, size: d ? 0 : o, is_dir: d, modified: l }
  }
  let s = t.match(
    /^(\d{2}-\d{2}-\d{2,4}\s+\d{1,2}:\d{2}(?:[AP]M)?)\s+(<DIR>|\d+)\s+(.+)$/i,
  )
  if (s) {
    let n = s[1],
      o = s[2].toUpperCase(),
      a = s[3].trim()
    if (a === "." || a === "..") return null
    let c = o === "<DIR>",
      d = c ? 0 : parseInt(o, 10) || 0,
      l = new Date()
    try {
      let u = Date.parse(n)
      isNaN(u) || (l = new Date(u))
    } catch {}
    return { name: a, size: d, is_dir: c, modified: l }
  }
  return null
}
var go,
  mo,
  $r,
  yo = N(() => {
    "use strict"
    ho()
    ;((go = null), (mo = null))
    $r = class {
      addition
      controlSocket = null
      host
      port
      encoding
      responseBuffer = ""
      pendingCallbacks = []
      constructor(e) {
        this.addition = e
        let { host: t, port: i } = ru(e.address)
        ;((this.host = t), (this.port = i), (this.encoding = Or(e.encoding)))
      }
      async connect() {
        if (this.controlSocket && !this.controlSocket.destroyed)
          try {
            await this.sendCommand("NOOP")
            return
          } catch {
            this.close()
          }
        let e = await tu()
        return new Promise((t, i) => {
          let s = !0,
            n = e.createConnection(
              { host: this.host, port: this.port },
              () => {},
            )
          ;((this.controlSocket = n),
            n.setTimeout(15e3),
            n.on("data", (o) => {
              this.handleData(o)
            }),
            n.on("error", (o) => {
              ;(s && i(o), this.close())
            }),
            n.on("timeout", () => {
              ;(this.close(), i(new Error("[FTP] Control connection timeout")))
            }),
            n.on("close", () => {
              this.close()
            }),
            this.pendingCallbacks.push({
              resolve: async (o) => {
                if (((s = !1), o.code !== 220))
                  return (
                    this.close(),
                    i(new Error(`[FTP] Unexpected banner: ${o.raw}`))
                  )
                try {
                  ;(await this.login(), t())
                } catch (a) {
                  ;(this.close(), i(a))
                }
              },
              reject: (o) => {
                ;((s = !1), this.close(), i(o))
              },
            }))
        })
      }
      async login() {
        let e = await this.sendCommand(`USER ${this.addition.username}`)
        if (e.code === 331) {
          let t = await this.sendCommand(`PASS ${this.addition.password || ""}`)
          if (t.code !== 230)
            throw new Error(`[FTP] Login failed: ${t.message}`)
        } else if (e.code !== 230)
          throw new Error(`[FTP] Login failed: ${e.message}`)
        if ((await this.sendCommand("TYPE I"), this.encoding === "utf-8"))
          try {
            await this.sendCommand("OPTS UTF8 ON")
          } catch {}
      }
      handleData(e) {
        let t = Hs(e, this.encoding)
        this.responseBuffer += t
        let i = this.responseBuffer.split(`\r
`)
        if (i.length > 1) {
          this.responseBuffer = i.pop() || ""
          for (let s of i) {
            if (!s.trim()) continue
            let n = s.match(/^(\d{3})(?: (.*))?$/)
            if (n) {
              let o = parseInt(n[1], 10),
                a = n[2] || "",
                c = this.pendingCallbacks.shift()
              c && c.resolve({ code: o, message: a, raw: s })
            }
          }
        }
      }
      async sendCommand(e) {
        return (
          (!this.controlSocket || this.controlSocket.destroyed) &&
            (await this.connect()),
          new Promise((t, i) => {
            this.pendingCallbacks.push({ resolve: t, reject: i })
            let s = Buffer.concat([
              po(e, this.encoding),
              Buffer.from(
                `\r
`,
                "ascii",
              ),
            ])
            this.controlSocket.write(s, (n) => {
              if (n) {
                let o = this.pendingCallbacks.findIndex((a) => a.resolve === t)
                ;(o >= 0 && this.pendingCallbacks.splice(o, 1), i(n))
              }
            })
          })
        )
      }
      async openDataConnection() {
        let e = await tu(),
          t = await this.sendCommand("PASV")
        if (t.code !== 227) throw new Error(`[FTP] PASV failed: ${t.raw}`)
        let i = t.message.match(/\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/)
        if (!i) throw new Error(`[FTP] Invalid PASV response: ${t.message}`)
        let s = `${i[1]}.${i[2]}.${i[3]}.${i[4]}`,
          n = parseInt(i[5], 10) * 256 + parseInt(i[6], 10),
          o = s === "0.0.0.0" || s === "127.0.0.1" ? this.host : s
        return {
          dataSocket: e.createConnection({ host: o, port: n }),
          host: o,
          port: n,
        }
      }
      async list(e, t = !1) {
        await this.connect()
        let i = e || "/",
          s = i
        t && i !== "/" && (await this.sendCommand(`CWD ${i}`), (s = ""))
        let { dataSocket: n } = await this.openDataConnection(),
          o = [],
          a = new Promise((m, w) => {
            ;(n.on("data", (g) => o.push(g)),
              n.on("error", w),
              n.on("close", () => m(Buffer.concat(o))))
          }),
          c = s ? `LIST ${s}` : "LIST",
          d = await this.sendCommand(c)
        if (d.code >= 400)
          throw (n.destroy(), new Error(`[FTP] LIST failed: ${d.raw}`))
        let l = await a,
          u = await new Promise((m, w) => {
            this.pendingCallbacks.push({ resolve: m, reject: w })
          })
        if (u.code >= 400 && u.code !== 226 && u.code !== 250)
          throw new Error(`[FTP] LIST completion error: ${u.raw}`)
        let p = Hs(l, this.encoding).split(/\r?\n/),
          h = []
        for (let m of p) {
          let w = iu(m, this.encoding)
          w && h.push(w)
        }
        return h
      }
      async stat(e) {
        await this.connect()
        let t = e.replace(/\\/g, "/"),
          i = t.slice(0, t.lastIndexOf("/")) || "/",
          s = t.split("/").filter(Boolean).pop() || ""
        if (!s || t === "/")
          return { name: "root", size: 0, is_dir: !0, modified: new Date() }
        let o = (await this.list(i)).find((a) => a.name === s)
        if (!o) throw new Error(`[FTP] File not found: ${e}`)
        return o
      }
      async mkdir(e) {
        await this.connect()
        let t = await this.sendCommand(`MKD ${e}`)
        if (t.code >= 400 && t.code !== 550)
          throw new Error(`[FTP] MKD failed: ${t.raw}`)
      }
      async mkdirAll(e) {
        let t = e.replace(/\\/g, "/"),
          i = t.split("/").filter(Boolean),
          s = t.startsWith("/") ? "/" : ""
        for (let n of i) {
          s = s === "/" ? "/" + n : s + "/" + n
          try {
            await this.mkdir(s)
          } catch {}
        }
      }
      async rename(e, t) {
        await this.connect()
        let i = await this.sendCommand(`RNFR ${e}`)
        if (i.code !== 350) throw new Error(`[FTP] RNFR failed: ${i.raw}`)
        let s = await this.sendCommand(`RNTO ${t}`)
        if (s.code !== 250) throw new Error(`[FTP] RNTO failed: ${s.raw}`)
      }
      async removeFile(e) {
        await this.connect()
        let t = await this.sendCommand(`DELE ${e}`)
        if (t.code >= 400 && t.code !== 550)
          throw new Error(`[FTP] DELE failed: ${t.raw}`)
      }
      async removeDir(e) {
        await this.connect()
        let t = await this.sendCommand(`RMD ${e}`)
        if (t.code >= 400 && t.code !== 550)
          throw new Error(`[FTP] RMD failed: ${t.raw}`)
      }
      async removeRecursive(e) {
        let t = []
        try {
          t = await this.list(e)
        } catch {
          await this.removeFile(e)
          return
        }
        for (let i of t) {
          let s = `${e.replace(/\/+$/, "")}/${i.name}`
          i.is_dir ? await this.removeRecursive(s) : await this.removeFile(s)
        }
        await this.removeDir(e)
      }
      async upload(e, t) {
        await this.connect()
        let { dataSocket: i } = await this.openDataConnection(),
          s = await this.sendCommand(`STOR ${e}`)
        if (s.code >= 400)
          throw (i.destroy(), new Error(`[FTP] STOR failed: ${s.raw}`))
        await new Promise((o, a) => {
          ;(i.on("error", a), i.end(t, () => o()))
        })
        let n = await new Promise((o, a) => {
          this.pendingCallbacks.push({ resolve: o, reject: a })
        })
        if (n.code >= 400 && n.code !== 226 && n.code !== 250)
          throw new Error(`[FTP] Upload completion error: ${n.raw}`)
      }
      async download(e, t) {
        await this.connect()
        let { PassThrough: i } = await Ih()
        if (t && t.start && t.start > 0) {
          let d = await this.sendCommand(`REST ${t.start}`)
          if (d.code !== 350)
            throw new Error(`[FTP] REST offset failed: ${d.raw}`)
        }
        let { dataSocket: s } = await this.openDataConnection(),
          n = await this.sendCommand(`RETR ${e}`)
        if (n.code >= 400)
          throw (s.destroy(), new Error(`[FTP] RETR failed: ${n.raw}`))
        let o = new i(),
          a = 0,
          c =
            t && typeof t.end == "number" && typeof t.start == "number"
              ? t.end - t.start + 1
              : 1 / 0
        return (
          s.on("data", (d) => {
            if (a >= c) {
              s.destroy()
              return
            }
            if (a + d.length > c) {
              let l = d.slice(0, c - a)
              ;(o.write(l), (a += l.length), s.destroy())
            } else (o.write(d), (a += d.length))
          }),
          s.on("error", (d) => {
            o.destroy(d)
          }),
          s.on("close", () => {
            o.end()
          }),
          o
        )
      }
      close() {
        if (this.controlSocket) {
          try {
            this.controlSocket.destroy()
          } catch {}
          this.controlSocket = null
        }
        for (this.responseBuffer = ""; this.pendingCallbacks.length > 0; ) {
          let e = this.pendingCallbacks.shift()
          e && e.reject(new Error("[FTP] Connection closed"))
        }
      }
    }
  })
function wo(r) {
  let e = { ...(r || {}) }
  return (
    (e.address = (e.address || "").trim()),
    (e.username = (e.username || "").trim()),
    (e.password = e.password || ""),
    (e.encoding = (e.encoding || "utf-8").trim()),
    (e.cwd_list = e.cwd_list === !0 || e.cwd_list === "true"),
    (e.root_folder_path = (e.root_folder_path || "/").trim()),
    e.root_folder_path.startsWith("/") ||
      (e.root_folder_path = "/" + e.root_folder_path),
    e
  )
}
function Le(r) {
  return (
    "/" + (r || "").replace(/\\/g, "/").split("/").filter(Boolean).join("/")
  )
}
function su(r) {
  let e = Le(r),
    t = e.lastIndexOf("/")
  return t <= 0 ? "/" : e.slice(0, t)
}
function Vt(...r) {
  let e = r.map((t) => (t || "").replace(/\\/g, "/")).join("/")
  return Le(e)
}
var Ks,
  nu = N(() => {
    "use strict"
    fe()
    yo()
    Ks = class {
      client
      addition
      constructor(e) {
        ;((this.addition = wo(e)), (this.client = new $r(this.addition)))
      }
      async init() {
        if (!this.addition.address || !this.addition.username)
          throw new Error("[FTP] address and username are required")
        await this.client.connect()
      }
      async list(e, t) {
        let i = Le(t || this.addition.root_folder_path || "/"),
          s = !!this.addition.cwd_list,
          n = await this.client.list(i, s),
          o = []
        for (let a of n) {
          let c = Vt(i, a.name),
            d = a.modified
              ? new Date(a.modified).toISOString()
              : new Date().toISOString()
          o.push({
            name: a.name,
            size: a.is_dir ? 0 : a.size,
            is_dir: a.is_dir,
            modified: d,
            sign: c,
            type: L(a.name, a.is_dir),
            raw_url: "",
          })
        }
        return o
      }
      async get(e, t) {
        let i = Le(t || this.addition.root_folder_path || "/")
        if (i === "/" || i === Le(this.addition.root_folder_path || "/"))
          return {
            name: "root",
            size: 0,
            is_dir: !0,
            modified: new Date().toISOString(),
            sign: i,
            type: 1,
            raw_url: "",
          }
        let s = await this.client.stat(i),
          n = i.split("/").filter(Boolean).pop() || "root",
          o = s.modified
            ? new Date(s.modified).toISOString()
            : new Date().toISOString()
        return {
          name: n,
          size: s.is_dir ? 0 : s.size,
          is_dir: s.is_dir,
          modified: o,
          sign: i,
          type: L(n, s.is_dir),
          raw_url: "",
        }
      }
      async mkdir(e, t) {
        let i = Le(t)
        await this.client.mkdirAll(i)
      }
      async rename(e, t, i) {
        let s = Le(t),
          n = Vt(su(s), i)
        await this.client.rename(s, n)
      }
      async remove(e, t, i) {
        let s = Le(t)
        if (i && i.length > 0)
          for (let n of i) await this.client.removeRecursive(Vt(s, n))
        else await this.client.removeRecursive(s)
      }
      async move(e, t, i, s, n) {
        if (i && i.length > 0)
          for (let o of i) {
            let a = Vt(s, o),
              c = Vt(n, o)
            await this.client.rename(a, c)
          }
        else {
          let o = s.split("/").filter(Boolean).pop() || "",
            a = Vt(t, o)
          await this.client.rename(Le(s), a)
        }
      }
      async copy(e, t, i, s, n) {
        throw new Error("[FTP] Copy not supported")
      }
      async put(e, t, i) {
        let s = Le(t)
        ;(await this.client.mkdirAll(su(s)), await this.client.upload(s, i))
      }
      async createReadStream(e, t) {
        let i = Le(e)
        return this.client.download(i, t)
      }
    }
  })
var ou = N(() => {
  "use strict"
})
var au = {}
jt(au, {
  FTPClient: () => $r,
  FTPDriver: () => Ks,
  decodeFtpBuffer: () => Hs,
  encodeFtpString: () => po,
  normalizeEncoding: () => Or,
  normalizeFTPAddition: () => wo,
  parseFtpAddress: () => ru,
  parseListLine: () => iu,
})
var cu = N(() => {
  "use strict"
  nu()
  ou()
  ho()
  yo()
})
var yu,
  Lh,
  Nh,
  Mh,
  Hh,
  mu,
  Gs,
  bo,
  wu = N(() => {
    xt()
    ;((yu = { name: "HMAC", hash: "SHA-256" }),
      (Lh = async (r) => {
        let e = typeof r == "string" ? new TextEncoder().encode(r) : r
        return await crypto.subtle.importKey("raw", e, yu, !1, [
          "sign",
          "verify",
        ])
      }),
      (Nh = async (r, e, t) => {
        try {
          let i = atob(r),
            s = new Uint8Array(i.length)
          for (let n = 0, o = i.length; n < o; n++) s[n] = i.charCodeAt(n)
          return await crypto.subtle.verify(
            yu,
            t,
            s,
            new TextEncoder().encode(e),
          )
        } catch {
          return !1
        }
      }),
      (Mh = /^[!#-:<>-[\]-~]+$/),
      (Hh = /^[ !#-:<-[\]-~]*$/),
      (mu = (r) => {
        let e = 0,
          t = r.length
        for (; e < t; ) {
          let i = r.charCodeAt(e)
          if (i !== 32 && i !== 9) break
          e++
        }
        for (; t > e; ) {
          let i = r.charCodeAt(t - 1)
          if (i !== 32 && i !== 9) break
          t--
        }
        return e === 0 && t === r.length ? r : r.slice(e, t)
      }),
      (Gs = (r, e) => {
        if (e && r.indexOf(e) === -1) return {}
        let t = r.split(";"),
          i = Object.create(null)
        for (let s of t) {
          let n = s.indexOf("=")
          if (n === -1) continue
          let o = mu(s.substring(0, n))
          if ((e && e !== o) || !Mh.test(o) || o in i) continue
          let a = mu(s.substring(n + 1))
          if (
            (a.startsWith('"') && a.endsWith('"') && (a = a.slice(1, -1)),
            Hh.test(a) && ((i[o] = zt(a)), e))
          )
            break
        }
        return i
      }),
      (bo = async (r, e, t) => {
        let i = Object.create(null),
          s = await Lh(e)
        for (let [n, o] of Object.entries(Gs(r, t))) {
          let a = o.lastIndexOf(".")
          if (a < 1) continue
          let c = o.substring(0, a),
            d = o.substring(a + 1)
          if (d.length !== 44 || !d.endsWith("=")) continue
          let l = await Nh(d, c, s)
          i[n] = l ? c : !1
        }
        return i
      }))
  })
var Vs,
  ko,
  xu = N(() => {
    wu()
    ;((Vs = (r, e, t) => {
      let i = r.req.raw.headers.get("Cookie")
      if (typeof e == "string") {
        if (!i) return
        let n = e
        return (
          t === "secure"
            ? (n = "__Secure-" + e)
            : t === "host" && (n = "__Host-" + e),
          Gs(i, n)[n]
        )
      }
      return i ? Gs(i) : {}
    }),
      (ko = async (r, e, t, i) => {
        let s = r.req.raw.headers.get("Cookie")
        if (typeof t == "string") {
          if (!s) return
          let o = t
          return (
            i === "secure"
              ? (o = "__Secure-" + t)
              : i === "host" && (o = "__Host-" + t),
            (await bo(s, e, o))[o]
          )
        }
        return s ? await bo(s, e) : {}
      }))
  })
var So,
  Po,
  Kh,
  Ao,
  Co = N(() => {
    ;((So = (r) =>
      Ao(r.replace(/_|-/g, (e) => ({ _: "/", "-": "+" })[e] ?? e))),
      (Po = (r) =>
        Kh(r).replace(/\/|\+/g, (e) => ({ "/": "_", "+": "-" })[e] ?? e)),
      (Kh = (r) => {
        let e = "",
          t = new Uint8Array(r)
        for (let i = 0, s = t.length; i < s; i++) e += String.fromCharCode(t[i])
        return btoa(e)
      }),
      (Ao = (r) => {
        let e = atob(r),
          t = new Uint8Array(new ArrayBuffer(e.length)),
          i = e.length / 2
        for (let s = 0, n = e.length - 1; s <= i; s++, n--)
          ((t[s] = e.charCodeAt(s)), (t[n] = e.charCodeAt(n)))
        return t
      }))
  })
var yt,
  Eo = N(() => {
    yt = ((r) => (
      (r.HS256 = "HS256"),
      (r.HS384 = "HS384"),
      (r.HS512 = "HS512"),
      (r.RS256 = "RS256"),
      (r.RS384 = "RS384"),
      (r.RS512 = "RS512"),
      (r.PS256 = "PS256"),
      (r.PS384 = "PS384"),
      (r.PS512 = "PS512"),
      (r.ES256 = "ES256"),
      (r.ES384 = "ES384"),
      (r.ES512 = "ES512"),
      (r.EdDSA = "EdDSA"),
      r
    ))(yt || {})
  })
var Wh,
  _u,
  Gh,
  vu = N(() => {
    ;((Wh = {
      deno: "Deno",
      bun: "Bun",
      workerd: "Cloudflare-Workers",
      node: "Node.js",
    }),
      (_u = () => {
        let r = globalThis
        if (typeof navigator < "u" && typeof navigator.userAgent == "string") {
          for (let [t, i] of Object.entries(Wh)) if (Gh(i)) return t
        }
        return typeof r?.EdgeRuntime == "string"
          ? "edge-light"
          : r?.fastly !== void 0
            ? "fastly"
            : r?.process?.release?.name === "node"
              ? "node"
              : "other"
      }),
      (Gh = (r) => navigator.userAgent.startsWith(r)))
  })
var bu,
  Do,
  Fo,
  Et,
  ku,
  Su,
  Pu,
  Js,
  To,
  Au,
  Cu,
  Eu,
  Du,
  Fu,
  Tu,
  Qt,
  Io = N(() => {
    ;((bu = class extends Error {
      constructor(r) {
        ;(super(`${r} is not an implemented algorithm`),
          (this.name = "JwtAlgorithmNotImplemented"))
      }
    }),
      (Do = class extends Error {
        constructor() {
          ;(super('JWT verification requires "alg" option to be specified'),
            (this.name = "JwtAlgorithmRequired"))
        }
      }),
      (Fo = class extends Error {
        constructor(r, e) {
          ;(super(`JWT algorithm mismatch: expected "${r}", got "${e}"`),
            (this.name = "JwtAlgorithmMismatch"))
        }
      }),
      (Et = class extends Error {
        constructor(r) {
          ;(super(`invalid JWT token: ${r}`), (this.name = "JwtTokenInvalid"))
        }
      }),
      (ku = class extends Error {
        constructor(r) {
          ;(super(`token (${r}) is being used before it's valid`),
            (this.name = "JwtTokenNotBefore"))
        }
      }),
      (Su = class extends Error {
        constructor(r) {
          ;(super(`token (${r}) expired`), (this.name = "JwtTokenExpired"))
        }
      }),
      (Pu = class extends Error {
        constructor(r, e) {
          ;(super(
            `Invalid "iat" claim, must be a valid number lower than "${r}" (iat: "${e}")`,
          ),
            (this.name = "JwtTokenIssuedAt"))
        }
      }),
      (Js = class extends Error {
        constructor(r, e) {
          ;(super(`expected issuer "${r}", got ${e ? `"${e}"` : "none"} `),
            (this.name = "JwtTokenIssuer"))
        }
      }),
      (To = class extends Error {
        constructor(r) {
          ;(super(`jwt header is invalid: ${JSON.stringify(r)}`),
            (this.name = "JwtHeaderInvalid"))
        }
      }),
      (Au = class extends Error {
        constructor(r) {
          ;(super(`required "kid" in jwt header: ${JSON.stringify(r)}`),
            (this.name = "JwtHeaderRequiresKid"))
        }
      }),
      (Cu = class extends Error {
        constructor(r) {
          ;(super(
            `symmetric algorithm "${r}" is not allowed for JWK verification`,
          ),
            (this.name = "JwtSymmetricAlgorithmNotAllowed"))
        }
      }),
      (Eu = class extends Error {
        constructor(r, e) {
          ;(super(
            `algorithm "${r}" is not in the allowed list: [${e.join(", ")}]`,
          ),
            (this.name = "JwtAlgorithmNotAllowed"))
        }
      }),
      (Du = class extends Error {
        constructor(r) {
          ;(super(`token(${r}) signature mismatched`),
            (this.name = "JwtTokenSignatureMismatched"))
        }
      }),
      (Fu = class extends Error {
        constructor(r) {
          ;(super(`required "aud" in jwt payload: ${JSON.stringify(r)}`),
            (this.name = "JwtPayloadRequiresAud"))
        }
      }),
      (Tu = class extends Error {
        constructor(r, e) {
          ;(super(
            `expected audience "${Array.isArray(r) ? r.join(", ") : r}", got "${e}"`,
          ),
            (this.name = "JwtTokenAudience"))
        }
      }),
      (Qt = ((r) => (
        (r.Encrypt = "encrypt"),
        (r.Decrypt = "decrypt"),
        (r.Sign = "sign"),
        (r.Verify = "verify"),
        (r.DeriveKey = "deriveKey"),
        (r.DeriveBits = "deriveBits"),
        (r.WrapKey = "wrapKey"),
        (r.UnwrapKey = "unwrapKey"),
        r
      ))(Qt || {})))
  })
var Dt,
  Iu,
  Bo = N(() => {
    ;((Dt = new TextEncoder()), (Iu = new TextDecoder()))
  })
async function Ru(r, e, t) {
  let i = qu(e),
    s = await Vh(r, i)
  return await crypto.subtle.sign(i, s, t)
}
async function Uu(r, e, t, i) {
  let s = qu(e),
    n = await Jh(r, s)
  return await crypto.subtle.verify(s, n, t, i)
}
function Ro(r) {
  return Ao(r.replace(/-+(BEGIN|END).*?-+/g, "").replace(/\s/g, ""))
}
async function Vh(r, e) {
  if (!crypto.subtle || !crypto.subtle.importKey)
    throw new Error(
      "`crypto.subtle.importKey` is undefined. JWT auth middleware requires it.",
    )
  if (Ou(r)) {
    if (r.type !== "private" && r.type !== "secret")
      throw new Error(
        `unexpected key type: CryptoKey.type is ${r.type}, expected private or secret`,
      )
    return r
  }
  let t = [Qt.Sign]
  return typeof r == "object"
    ? await crypto.subtle.importKey("jwk", r, e, !1, t)
    : r.includes("PRIVATE")
      ? await crypto.subtle.importKey("pkcs8", Ro(r), e, !1, t)
      : await crypto.subtle.importKey("raw", Dt.encode(r), e, !1, t)
}
async function Jh(r, e) {
  if (!crypto.subtle || !crypto.subtle.importKey)
    throw new Error(
      "`crypto.subtle.importKey` is undefined. JWT auth middleware requires it.",
    )
  if (Ou(r)) {
    if (r.type === "public" || r.type === "secret") return r
    r = await Bu(r)
  }
  if (typeof r == "string" && r.includes("PRIVATE")) {
    let i = await crypto.subtle.importKey("pkcs8", Ro(r), e, !0, [Qt.Sign])
    r = await Bu(i)
  }
  let t = [Qt.Verify]
  return typeof r == "object"
    ? await crypto.subtle.importKey("jwk", r, e, !1, t)
    : r.includes("PUBLIC")
      ? await crypto.subtle.importKey("spki", Ro(r), e, !1, t)
      : await crypto.subtle.importKey("raw", Dt.encode(r), e, !1, t)
}
async function Bu(r) {
  if (r.type !== "private") throw new Error(`unexpected key type: ${r.type}`)
  if (!r.extractable) throw new Error("unexpected private key is unextractable")
  let e = await crypto.subtle.exportKey("jwk", r),
    { kty: t } = e,
    { alg: i, e: s, n } = e,
    { crv: o, x: a, y: c } = e
  return { kty: t, alg: i, e: s, n, crv: o, x: a, y: c, key_ops: [Qt.Verify] }
}
function qu(r) {
  switch (r) {
    case "HS256":
      return { name: "HMAC", hash: { name: "SHA-256" } }
    case "HS384":
      return { name: "HMAC", hash: { name: "SHA-384" } }
    case "HS512":
      return { name: "HMAC", hash: { name: "SHA-512" } }
    case "RS256":
      return { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } }
    case "RS384":
      return { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-384" } }
    case "RS512":
      return { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-512" } }
    case "PS256":
      return { name: "RSA-PSS", hash: { name: "SHA-256" }, saltLength: 32 }
    case "PS384":
      return { name: "RSA-PSS", hash: { name: "SHA-384" }, saltLength: 48 }
    case "PS512":
      return { name: "RSA-PSS", hash: { name: "SHA-512" }, saltLength: 64 }
    case "ES256":
      return { name: "ECDSA", hash: { name: "SHA-256" }, namedCurve: "P-256" }
    case "ES384":
      return { name: "ECDSA", hash: { name: "SHA-384" }, namedCurve: "P-384" }
    case "ES512":
      return { name: "ECDSA", hash: { name: "SHA-512" }, namedCurve: "P-521" }
    case "EdDSA":
      return { name: "Ed25519", namedCurve: "Ed25519" }
    default:
      throw new bu(r)
  }
}
function Ou(r) {
  return _u() === "node" && crypto.webcrypto
    ? r instanceof crypto.webcrypto.CryptoKey
    : r instanceof CryptoKey
}
var $u = N(() => {
  vu()
  Co()
  Io()
  Bo()
})
function ju(r) {
  if (typeof r == "object" && r !== null) {
    let e = r
    return (
      "alg" in e &&
      Object.values(yt).includes(e.alg) &&
      (!("typ" in e) || e.typ === "JWT")
    )
  }
  return !1
}
var Uo,
  Qh,
  qo,
  zu,
  Oo,
  Xh,
  Lu,
  $o,
  Yh,
  Nu = N(() => {
    Co()
    Eo()
    $u()
    Io()
    Bo()
    ;((Uo = (r) => Po(Dt.encode(JSON.stringify(r)).buffer).replace(/=/g, "")),
      (Qh = (r) => Po(r).replace(/=/g, "")),
      (qo = (r) => JSON.parse(Iu.decode(So(r)))))
    ;((zu = async (r, e, t = "HS256") => {
      let i = Uo(r),
        s
      typeof e == "object" && "alg" in e
        ? ((t = e.alg), (s = Uo({ alg: t, typ: "JWT", kid: e.kid })))
        : (s = Uo({ alg: t, typ: "JWT" }))
      let n = `${s}.${i}`,
        o = await Ru(e, t, Dt.encode(n)),
        a = Qh(o)
      return `${n}.${a}`
    }),
      (Oo = async (r, e, t) => {
        if (!t) throw new Do()
        let {
          alg: i,
          iss: s,
          nbf: n = !0,
          exp: o = !0,
          iat: a = !0,
          aud: c,
        } = typeof t == "string" ? { alg: t } : t
        if (!i) throw new Do()
        let d = r.split(".")
        if (d.length !== 3) throw new Et(r)
        let { header: l, payload: u } = $o(r)
        if (!ju(l)) throw new To(l)
        if (l.alg !== i) throw new Fo(i, l.alg)
        let f = Math.floor(Date.now() / 1e3)
        if (
          n &&
          u.nbf !== void 0 &&
          (typeof u.nbf != "number" || !Number.isFinite(u.nbf) || u.nbf > f)
        )
          throw new ku(r)
        if (
          o &&
          u.exp !== void 0 &&
          (typeof u.exp != "number" || !Number.isFinite(u.exp) || u.exp <= f)
        )
          throw new Su(r)
        if (
          a &&
          u.iat !== void 0 &&
          (typeof u.iat != "number" || !Number.isFinite(u.iat) || f < u.iat)
        )
          throw new Pu(f, u.iat)
        if (s) {
          if (!u.iss) throw new Js(s, null)
          if (typeof s == "string" && u.iss !== s) throw new Js(s, u.iss)
          if (s instanceof RegExp && !s.test(u.iss)) throw new Js(s, u.iss)
        }
        if (c) {
          if (!u.aud) throw new Fu(u)
          if (
            !(Array.isArray(u.aud) ? u.aud : [u.aud]).some((g) =>
              c instanceof RegExp
                ? c.test(g)
                : typeof c == "string"
                  ? g === c
                  : Array.isArray(c) && c.includes(g),
            )
          )
            throw new Tu(c, u.aud)
        }
        let p = r.substring(0, r.lastIndexOf("."))
        if (!(await Uu(e, i, So(d[2]), Dt.encode(p)))) throw new Du(r)
        return u
      }),
      (Xh = [yt.HS256, yt.HS384, yt.HS512]),
      (Lu = async (r, e, t) => {
        let i = e.verification || {},
          s = Yh(r)
        if (!ju(s)) throw new To(s)
        if (!s.kid) throw new Au(s)
        if (Xh.includes(s.alg)) throw new Cu(s.alg)
        if (!e.allowedAlgorithms.includes(s.alg))
          throw new Eu(s.alg, e.allowedAlgorithms)
        let n = e.keys ? [...e.keys] : void 0
        if (e.jwks_uri) {
          let a = await fetch(e.jwks_uri, t)
          if (!a.ok) throw new Error(`failed to fetch JWKS from ${e.jwks_uri}`)
          let c = await a.json()
          if (!c.keys)
            throw new Error('invalid JWKS response. "keys" field is missing')
          if (!Array.isArray(c.keys))
            throw new Error(
              'invalid JWKS response. "keys" field is not an array',
            )
          ;((n ??= []), n.push(...c.keys))
        } else if (!n)
          throw new Error(
            'verifyWithJwks requires options for either "keys" or "jwks_uri" or both',
          )
        let o = n.find((a) => a.kid === s.kid)
        if (!o) throw new Et(r)
        if (o.alg && o.alg !== s.alg) throw new Fo(o.alg, s.alg)
        return await Oo(r, o, { alg: s.alg, ...i })
      }),
      ($o = (r) => {
        let e = r.split(".")
        if (e.length !== 3) throw new Et(r)
        try {
          let t = qo(e[0]),
            i = qo(e[1])
          return { header: t, payload: i }
        } catch {
          throw new Et(r)
        }
      }),
      (Yh = (r) => {
        let e = r.split(".")
        if (e.length !== 3) throw new Et(r)
        try {
          return qo(e[0])
        } catch {
          throw new Et(r)
        }
      }))
  })
var Xt,
  Mu = N(() => {
    Nu()
    Xt = { sign: zu, verify: Oo, decode: $o, verifyWithJwks: Lu }
  })
function jo(r) {
  let e = (r.realm ?? r.ctx.req.url).replace(/"/g, '\\"'),
    t = r.errDescription.replace(/"/g, '\\"')
  return new Response("Unauthorized", {
    status: 401,
    statusText: r.statusText,
    headers: {
      "WWW-Authenticate": `Bearer realm="${e}",error="${r.error}",error_description="${t}"`,
    },
  })
}
var Hu,
  Ku,
  wt,
  Wu,
  Lr,
  Gu = N(() => {
    xu()
    an()
    Mu()
    ti()
    Hu = (r) => {
      let e = r.verification || {}
      if (!r || !r.secret)
        throw new Error('JWT auth middleware requires options for "secret"')
      if (!r.alg)
        throw new Error('JWT auth middleware requires options for "alg"')
      if (!crypto.subtle || !crypto.subtle.importKey)
        throw new Error(
          "`crypto.subtle.importKey` is undefined. JWT auth middleware requires it.",
        )
      return async function (i, s) {
        let n = r.headerName || "Authorization",
          o = i.req.raw.headers.get(n),
          a
        if (o) {
          let l = o.split(/\s+/)
          if (l.length !== 2 || l[0].toLowerCase() !== "bearer") {
            let u = "invalid credentials structure"
            throw new ur(401, {
              message: u,
              res: jo({
                ctx: i,
                error: "invalid_request",
                errDescription: u,
                realm: r.realm,
              }),
            })
          } else a = l[1]
        } else
          r.cookie &&
            (typeof r.cookie == "string"
              ? (a = Vs(i, r.cookie))
              : r.cookie.secret
                ? r.cookie.prefixOptions
                  ? (a = await ko(
                      i,
                      r.cookie.secret,
                      r.cookie.key,
                      r.cookie.prefixOptions,
                    ))
                  : (a = await ko(i, r.cookie.secret, r.cookie.key))
                : r.cookie.prefixOptions
                  ? (a = Vs(i, r.cookie.key, r.cookie.prefixOptions))
                  : (a = Vs(i, r.cookie.key)))
        if (!a) {
          let l = "no authorization included in request"
          throw new ur(401, {
            message: l,
            res: jo({
              ctx: i,
              error: "invalid_request",
              errDescription: l,
              realm: r.realm,
            }),
          })
        }
        let c, d
        try {
          c = await Xt.verify(a, r.secret, { alg: r.alg, ...e })
        } catch (l) {
          d = l
        }
        if (!c)
          throw new ur(401, {
            message: "Unauthorized",
            res: jo({
              ctx: i,
              error: "invalid_token",
              statusText: "Unauthorized",
              errDescription: "token verification failure",
              realm: r.realm,
            }),
            cause: d,
          })
        ;(i.set("jwtPayload", c), await s())
      }
    }
    ;((Ku = Xt.verifyWithJwks),
      (wt = Xt.verify),
      (Wu = Xt.decode),
      (Lr = Xt.sign))
  })
var Vu = {}
jt(Vu, {
  AlgorithmTypes: () => yt,
  decode: () => Wu,
  jwt: () => Hu,
  sign: () => Lr,
  verify: () => wt,
  verifyWithJwks: () => Ku,
})
var Nr = N(() => {
  Gu()
  Eo()
})
var Ju = N(() => {
  "use strict"
})
function ie(r, e = "Internal server error") {
  if (!r) return e
  let t = typeof r == "string" ? r : r?.message || String(r)
  if (!t) return e
  let i = String(t)
  return i.length > 200 ||
    (/[A-Za-z]:[\\/][^\\/\s]|[\\/][A-Za-z0-9_.-]+[\\/][A-Za-z0-9_.-]/.test(i) &&
      /\.(ts|js|mjs|cjs|json|toml|yml|yaml)/i.test(i)) ||
    /at .*\(|at [A-Za-z0-9_.-]+:[0-9]+:[0-9]+/.test(i)
    ? e
    : i
}
var Ft,
  L1,
  Mr = N(() => {
    "use strict"
    ;((Ft = class extends Error {
      constructor(t, i, s) {
        super(i)
        this.code = t
        this.message = i
        this.originalError = s
        this.name = "OpenListNextNextError"
      }
      code
      message
      originalError
    }),
      (L1 = {
        PathNotFound: new Ft(1004, "Path not found"),
        NotReady: new Ft(1003, "Storage not ready"),
        InvalidConfig: new Ft(1001, "Invalid configuration"),
        Unauthorized: new Ft(401, "Unauthorized access"),
        Forbidden: new Ft(403, "Permission denied"),
      }))
  })
var Qu = N(() => {
  "use strict"
})
var Xu = N(() => {
  "use strict"
})
var Yu = N(() => {
  "use strict"
})
async function Tt(r) {
  let e = r.req.header("Authorization")
  if (!e) return !1
  let t = e.startsWith("Bearer ") ? e.substring(7) : e,
    i = await U(r.env),
    s = i.settings.find((n) => n.key === "token")
  if (s && s.value && t === s.value) return !0
  try {
    let { verify: n } = await Promise.resolve().then(() => (Nr(), Vu)),
      { getJwtSecret: o } = await Promise.resolve().then(() => (Ge(), Zu)),
      a = await o(r),
      c = await n(t, a, "HS256")
    if (c && c.role === 2) {
      let d = (i.users || []).find(
        (l) => l.id === c.id || l.username === c.username,
      )
      return !!(d && !d.disabled)
    }
  } catch {}
  return !1
}
var Qs = N(() => {
  "use strict"
  te()
  Ju()
  Mr()
  Qu()
  Xu()
  Sr()
  Yu()
})
var Zu = {}
jt(Zu, {
  adminAuthMiddleware: () => ke,
  getJwtSecret: () => Ne,
  getUserFromContext: () => Y,
})
function Zh() {
  let r = new Uint8Array(32)
  return (
    crypto.getRandomValues(r),
    Array.from(r, (e) => e.toString(16).padStart(2, "0")).join("")
  )
}
async function eg(r) {
  try {
    let { getKvBinding: e } = await Promise.resolve().then(() => (te(), Dn)),
      t = await e(r)
    if (t.mode === "none" || !t.binding) return null
    let { binding: i, mode: s } = t,
      n = null
    if (s === "blob") n = await i.get(It)
    else
      try {
        n = await i.get(It, "text")
      } catch {
        n = await i.get(It)
      }
    return (
      n && typeof n.text == "function" && (n = await n.text()),
      n ? String(n) : null
    )
  } catch (e) {
    return (console.warn("[JWT] Failed to read secret from KV:", e), null)
  }
}
async function tg(r, e) {
  try {
    let { getKvBinding: t } = await Promise.resolve().then(() => (te(), Dn)),
      i = await t(r)
    if (i.mode === "none" || !i.binding) return
    let { binding: s, mode: n } = i
    n === "blob"
      ? typeof s.set == "function"
        ? await s.set(It, e)
        : typeof s.put == "function" && (await s.put(It, e))
      : typeof s.put == "function"
        ? await s.put(It, e)
        : typeof s.set == "function" && (await s.set(It, e))
  } catch (t) {
    console.warn("[JWT] Failed to persist secret to KV:", t)
  }
}
async function Ne(r) {
  let e = r?.env || (typeof process < "u" ? process.env : {}) || {},
    t = e.JWT_SECRET
  if (t && t.length >= 16) return t
  let i = await eg(e)
  return i && i.length >= 16 ? i : (Xs || ((Xs = Zh()), await tg(e, Xs)), Xs)
}
async function ke(r, e) {
  if (!(await Tt(r)))
    return r.json(
      {
        code: 401,
        message: "Unauthorized admin privilege required",
        data: null,
      },
      401,
    )
  await e()
}
async function Y(r) {
  if (await Tt(r))
    return {
      role: 2,
      permission: 0,
      disabled: !1,
      username: "api-token",
      base_path: "/",
    }
  let e = r.req.header("Authorization")
  if (!e) {
    let i = r.req.query("token") || r.req.query("access_token")
    i && (e = `Bearer ${i}`)
  }
  if (!e) {
    try {
      let s = ((await U(r.env)).users || []).find((n) => n.username === "guest")
      if (s && !s.disabled)
        return {
          id: s.id,
          role: s.role ?? 1,
          permission: s.permission ?? 0,
          disabled: !!s.disabled,
          username: s.username,
          base_path: s.base_path || "/",
          sso_id: s.sso_id || "",
          allow_ldap: !!s.allow_ldap,
          otp_secret: s.otp_secret,
        }
    } catch {}
    return null
  }
  let t = e.startsWith("Bearer ") ? e.substring(7) : e
  try {
    let i = await Ne(r),
      s = await wt(t, i, "HS256"),
      o = ((await U(r.env)).users || []).find(
        (a) => a.id === s.id || a.username === s.username,
      )
    return !o || o.disabled
      ? null
      : {
          id: o.id,
          role: o.role,
          permission: o.permission ?? 0,
          disabled: !!o.disabled,
          username: o.username,
          base_path: o.base_path || "/",
          sso_id: o.sso_id || "",
          allow_ldap: !!o.allow_ldap,
          otp_secret: o.otp_secret,
        }
  } catch {
    return null
  }
}
var Xs,
  It,
  Ge = N(() => {
    "use strict"
    Nr()
    Qs()
    te()
    ;((Xs = null), (It = "openlistnext_jwt_secret"))
  })
var on = (r, e, t) => (i, s) => {
  let n = -1
  return o(0)
  async function o(a) {
    if (a <= n) throw new Error("next() called multiple times")
    n = a
    let c,
      d = !1,
      l
    if (
      (r[a]
        ? ((l = r[a][0][0]), (i.req.routeIndex = a))
        : (l = (a === r.length && s) || void 0),
      l)
    )
      try {
        c = await l(i, () => o(a + 1))
      } catch (u) {
        if (u instanceof Error && e)
          ((i.error = u), (c = await e(u, i)), (d = !0))
        else throw u
      }
    else i.finalized === !1 && t && (c = await t(i))
    return (c && (i.finalized === !1 || d) && (i.res = c), i)
  }
}
ti()
var se = "ALL",
  Ea = "all",
  Da = ["get", "post", "put", "delete", "options", "patch", "query"],
  ri = "Can not add a route since the matcher is already built.",
  ii = class extends Error {}
var Fa = "__COMPOSED_HANDLER"
xt()
var Y0 = (r) => r.text("404 Not Found", 404),
  Ta = (r, e) => {
    if ("getResponse" in r) {
      let t = r.getResponse()
      return e.newResponse(t.body, t)
    }
    return (console.error(r), e.text("Internal Server Error", 500))
  },
  Ia = class Ba {
    get;
    post
    put
    delete
    options
    patch
    query
    all
    on
    use
    router
    getPath
    _basePath = "/"
    #t = "/"
    routes = []
    constructor(e = {}) {
      ;([...Da, Ea].forEach((n) => {
        this[n] = (o, ...a) => (
          typeof o == "string" ? (this.#t = o) : this.#n(n, this.#t, o),
          a.forEach((c) => {
            this.#n(n, this.#t, c)
          }),
          this
        )
      }),
        (this.on = (n, o, ...a) => {
          for (let c of [o].flat()) {
            this.#t = c
            for (let d of [n].flat())
              a.map((l) => {
                this.#n(d.toUpperCase(), this.#t, l)
              })
          }
          return this
        }),
        (this.use = (n, ...o) => (
          typeof n == "string"
            ? (this.#t = n)
            : ((this.#t = "*"), o.unshift(n)),
          o.forEach((a) => {
            this.#n(se, this.#t, a)
          }),
          this
        )))
      let { strict: i, ...s } = e
      ;(Object.assign(this, s),
        (this.getPath = (i ?? !0) ? (e.getPath ?? ln) : _a))
    }
    #e() {
      let e = new Ba({ router: this.router, getPath: this.getPath })
      return (
        (e.errorHandler = this.errorHandler),
        (e.#r = this.#r),
        (e.routes = this.routes),
        e
      )
    }
    #r = Y0
    errorHandler = Ta
    route(e, t) {
      let i = this.basePath(e)
      return (
        t.routes.map((s) => {
          let n
          ;(t.errorHandler === Ta
            ? (n = s.handler)
            : ((n = async (o, a) =>
                (await on([], t.errorHandler)(o, () => s.handler(o, a))).res),
              (n[Fa] = s.handler)),
            i.#n(s.method, s.path, n, s.basePath))
        }),
        this
      )
    }
    basePath(e) {
      let t = this.#e()
      return ((t._basePath = at(this._basePath, e)), t)
    }
    onError = (e) => ((this.errorHandler = e), this)
    notFound = (e) => ((this.#r = e), this)
    mount(e, t, i) {
      let s, n
      i &&
        (typeof i == "function"
          ? (n = i)
          : ((n = i.optionHandler),
            i.replaceRequest === !1 ? (s = (c) => c) : (s = i.replaceRequest)))
      let o = n
        ? (c) => {
            let d = n(c)
            return Array.isArray(d) ? d : [d]
          }
        : (c) => {
            let d
            try {
              d = c.executionCtx
            } catch {}
            return [c.env, d]
          }
      s ||= (() => {
        let c = at(this._basePath, e),
          d = c === "/" ? 0 : c.length
        return (l) => {
          let u = new URL(l.url)
          return (
            (u.pathname = this.getPath(l).slice(d) || "/"),
            new Request(u, l)
          )
        }
      })()
      let a = async (c, d) => {
        let l = await t(s(c.req.raw), ...o(c))
        if (l) return l
        await d()
      }
      return (this.#n(se, at(e, "*"), a), this)
    }
    #n(e, t, i, s) {
      ;((e = e.toUpperCase()), (t = at(this._basePath, t)))
      let n = {
        basePath: s !== void 0 ? at(this._basePath, s) : this._basePath,
        path: t,
        method: e,
        handler: i,
      }
      ;(this.router.add(e, t, [i, n]), this.routes.push(n))
    }
    #i(e, t) {
      if (e instanceof Error) return this.errorHandler(e, t)
      throw e
    }
    #s(e, t, i, s) {
      if (s === "HEAD")
        return (async () => new Response(null, await this.#s(e, t, i, "GET")))()
      let n = this.getPath(e, { env: i }),
        o = this.router.match(s, n),
        a = new pn(e, {
          path: n,
          matchResult: o,
          env: i,
          executionCtx: t,
          notFoundHandler: this.#r,
        })
      if (o[0].length === 1) {
        let d
        try {
          d = o[0][0][0][0](a, async () => {
            a.res = await this.#r(a)
          })
        } catch (l) {
          return this.#i(l, a)
        }
        return d instanceof Promise
          ? d
              .then((l) => l || (a.finalized ? a.res : this.#r(a)))
              .catch((l) => this.#i(l, a))
          : (d ?? this.#r(a))
      }
      let c = on(o[0], this.errorHandler, this.#r)
      return (async () => {
        try {
          let d = await c(a)
          if (!d.finalized)
            throw new Error(
              "Context is not finalized. Did you forget to return a Response object or `await next()`?",
            )
          return d.res
        } catch (d) {
          return this.#i(d, a)
        }
      })()
    }
    fetch = (e, ...t) => this.#s(e, t[1], t[0], e.method)
    request = (e, t, i, s) =>
      e instanceof Request
        ? this.fetch(t ? new Request(e, t) : e, i, s)
        : ((e = e.toString()),
          this.fetch(
            new Request(
              /^https?:\/\//.test(e) ? e : `http://localhost${at("/", e)}`,
              t,
            ),
            i,
            s,
          ))
    fire = () => {
      addEventListener("fetch", (e) => {
        e.respondWith(this.#s(e.request, e, void 0, e.request.method))
      })
    }
  }
xt()
var si = []
function hn(r, e) {
  let t = this.buildAllMatchers(),
    i = (s, n) => {
      let o = t[s] || t[se],
        a = o[2][n]
      if (a) return a
      let c = n.match(o[0])
      if (!c) return [[], si]
      let d = c.indexOf("", 1)
      return [o[1][d], c]
    }
  return ((this.match = i), i(r, e))
}
var ni = "[^/]+",
  Lt = ".*",
  _t = "(?:|/.*)",
  ct = Symbol(),
  Ra = new Set(".\\+*[^]$()")
function Z0(r, e) {
  return r.length === 1
    ? e.length === 1
      ? r < e
        ? -1
        : 1
      : -1
    : e.length === 1
      ? 1
      : r === Lt || r === _t
        ? e === _t
          ? -1
          : 1
        : e === Lt || e === _t
          ? -1
          : r === ni
            ? 1
            : e === ni
              ? -1
              : r.length === e.length
                ? r < e
                  ? -1
                  : 1
                : e.length - r.length
}
var Ua = class gn {
  #t
  #e
  #r = Object.create(null)
  insert(e, t, i, s, n) {
    let o = this
    for (let a = 0, c = e.length; a < c; a++) {
      let d = e[a],
        l =
          d.length === 1
            ? d === "*"
              ? a === c - 1
                ? ["", "", Lt]
                : ["", "", ni]
              : null
            : d === "/*"
              ? ["", "", _t]
              : d.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/),
        u
      if (l) {
        let f = l[1],
          p = l[2] || ni
        if (
          f &&
          l[2] &&
          (p === ".*" ||
            ((p = p.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:")),
            /\((?!\?:)/.test(p)) ||
            (p.length === 1 && Ra.has(p)))
        )
          throw ct
        if (((u = o.#r[p]), !u)) {
          if (p !== Lt && p !== _t) {
            for (let h in o.#r)
              if ((p.length > 1 || h.length > 1) && h !== Lt && h !== _t)
                throw ct
          }
          u = o.#r[p] = new gn()
        }
        f !== "" && ((u.#e ??= s.varIndex++), i.push([f, u.#e]))
      } else if (((u = o.#r[d]), !u)) {
        for (let f in o.#r) if (f.length > 1 && f !== Lt && f !== _t) throw ct
        u = o.#r[d] = new gn()
      }
      o = u
    }
    if (o.#t !== void 0) throw ct
    o.#t = n ? -1 : t
  }
  buildRegExpStr() {
    let t = Object.keys(this.#r)
      .sort(Z0)
      .map((i) => {
        let s = this.#r[i],
          n = s.buildRegExpStr()
        return n === ""
          ? ""
          : (typeof s.#e == "number"
              ? `(${i})@${s.#e}`
              : Ra.has(i)
                ? `\\${i}`
                : i) + n
      })
      .filter(Boolean)
    return (
      typeof this.#t == "number" && this.#t !== -1 && t.unshift(`#${this.#t}`),
      t.length === 0 ? "" : t.length === 1 ? t[0] : "(?:" + t.join("|") + ")"
    )
  }
}
var mn = class {
  #t = { varIndex: 0 }
  #e = new Ua()
  #r = 0
  paths = Object.create(null)
  insert(r, e) {
    if (e) {
      this.#e.insert(r.split(""), 0, [], this.#t, !0)
      return
    }
    let t = [],
      i = [],
      s = r
    for (let o = 0; ; ) {
      let a = !1
      if (
        ((s = s.replace(/\{[^}]+\}/g, (c) => {
          let d = `@\\${o}`
          return ((i[o] = [d, c]), o++, (a = !0), d)
        })),
        !a)
      )
        break
    }
    let n = s.match(/(?::[^\/]+)|(?:\/\*$)|./g) || []
    for (let o = i.length - 1; o >= 0; o--) {
      let [a] = i[o]
      for (let c = n.length - 1; c >= 0; c--)
        if (n[c].indexOf(a) !== -1) {
          n[c] = n[c].replace(a, i[o][1])
          break
        }
    }
    ;(this.#e.insert(n, this.#r, t, this.#t, !1),
      (this.paths[r] = [this.#r++, t]))
  }
  buildRegExp() {
    let r = this.#e.buildRegExpStr()
    if (r === "") return [/^$/, [], []]
    let e = 0,
      t = [],
      i = []
    return (
      (r = r.replace(/#(\d+)|@(\d+)|\.\*\$/g, (s, n, o) =>
        n !== void 0
          ? ((t[++e] = Number(n)), "$()")
          : (o !== void 0 && (i[Number(o)] = ++e), ""),
      )),
      [new RegExp(`^${r}`), t, i]
    )
  }
}
var qa = Object.create(null)
function Oa(r) {
  return (qa[r] ??= new RegExp(
    r === "*"
      ? ""
      : `^${r.replace(/\/\*$|([.\\+*[^\]$()])/g, (e, t) => (t ? `\\${t}` : "(?:|/.*)"))}$`,
  ))
}
function ef() {
  qa = Object.create(null)
}
function oi(r, e) {
  if (r) {
    for (let t of Object.keys(r).sort((i, s) => s.length - i.length))
      if (Oa(t).test(e)) return [...r[t]]
  }
}
var ai = class {
  name = "RegExpRouter"
  #t
  #e
  #r
  constructor() {
    ;((this.#t = { [se]: Object.create(null) }),
      (this.#e = { [se]: Object.create(null) }),
      (this.#r = { [se]: new mn() }))
  }
  #n(r, e) {
    try {
      this.#r[r].insert(e, !/\*|\/:/.test(e))
    } catch (t) {
      throw t === ct ? new ii(e) : t
    }
  }
  add(r, e, t) {
    let i = this.#t,
      s = this.#e
    if (!i || !s) throw new Error(ri)
    ;(i[r] ||
      ((this.#r[r] = new mn()),
      [i, s].forEach((a) => {
        ;((a[r] = Object.create(null)),
          Object.keys(a[se]).forEach((c) => {
            ;((a[r][c] = [...a[se][c]]), this.#n(r, c))
          }))
      })),
      e === "/*" && (e = "*"))
    let n = (e.match(/\/:/g) || []).length
    if (/\*$/.test(e)) {
      let a = Oa(e)
      ;(Object.keys(i).forEach((c) => {
        ;(r === se || r === c) &&
          !i[c][e] &&
          (this.#n(c, e), (i[c][e] = oi(i[c], e) || oi(i[se], e) || []))
      }),
        Object.keys(i).forEach((c) => {
          ;(r === se || r === c) &&
            Object.keys(i[c]).forEach((d) => {
              a.test(d) && i[c][d].push([t, n])
            })
        }),
        Object.keys(s).forEach((c) => {
          ;(r === se || r === c) &&
            Object.keys(s[c]).forEach((d) => a.test(d) && s[c][d].push([t, n]))
        }))
      return
    }
    let o = ei(e) || [e]
    for (let a = 0, c = o.length; a < c; a++) {
      let d = o[a]
      Object.keys(s).forEach((l) => {
        ;(r === se || r === l) &&
          (s[l][d] ||
            (this.#n(l, d),
            (s[l][d] = [...(oi(i[l], d) || oi(i[se], d) || [])])),
          s[l][d].push([t, n - c + a + 1]))
      })
    }
  }
  match = hn
  buildAllMatchers() {
    let r = Object.create(null)
    return (
      Object.keys(this.#e)
        .concat(Object.keys(this.#t))
        .forEach((e) => {
          r[e] ||= this.#i(e)
        }),
      (this.#t = this.#e = this.#r = void 0),
      ef(),
      r
    )
  }
  #i(r) {
    let e = this.#t[r],
      t = this.#e[r],
      i = this.#r[r],
      s = Object.create(null),
      n = []
    ;[e, t].forEach((l) => {
      for (let u in l) {
        let f = l[u],
          p = i.paths[u]
        if (!p) {
          s[u] = [f.map(([m]) => [m, Object.create(null)]), si]
          continue
        }
        let h = p[1]
        n[p[0]] = f.map(([m, w]) => {
          let g = Object.create(null)
          for (w -= 1; w >= 0; w--) {
            let [y, v] = h[w]
            g[y] = v
          }
          return [m, g]
        })
      }
    })
    let [o, a, c] = i.buildRegExp()
    for (let l = 0, u = n.length; l < u; l++)
      for (let f = 0, p = n[l].length; f < p; f++) {
        let h = n[l][f]?.[1]
        if (!h) continue
        let m = Object.keys(h)
        for (let w = 0, g = m.length; w < g; w++) h[m[w]] = c[h[m[w]]]
      }
    let d = []
    for (let l in a) d[l] = n[a[l]]
    return [o, d, s]
  }
}
var yn = class {
  name = "SmartRouter"
  #t = []
  #e = []
  constructor(r) {
    this.#t = r.routers
  }
  add(r, e, t) {
    if (!this.#e) throw new Error(ri)
    this.#e.push([r, e, t])
  }
  match(r, e) {
    if (!this.#e) throw new Error("Fatal error")
    let t = this.#t,
      i = this.#e,
      s = t.length,
      n = 0,
      o
    for (; n < s; n++) {
      let a = t[n]
      try {
        for (let c = 0, d = i.length; c < d; c++) a.add(...i[c])
        o = a.match(r, e)
      } catch (c) {
        if (c instanceof ii) continue
        throw c
      }
      ;((this.match = a.match.bind(a)), (this.#t = [a]), (this.#e = void 0))
      break
    }
    if (n === s) throw new Error("Fatal error")
    return ((this.name = `SmartRouter + ${this.activeRouter.name}`), o)
  }
  get activeRouter() {
    if (this.#e || this.#t.length !== 1)
      throw new Error("No active router has been determined yet.")
    return this.#t[0]
  }
}
xt()
xt()
var pr = Object.create(null),
  tf = (r) => {
    for (let e in r) return !0
    return !1
  },
  $a = class ja {
    #t
    #e
    #r
    #n = 0
    #i = pr
    constructor(e, t, i) {
      if (((this.#e = i || Object.create(null)), (this.#t = []), e && t)) {
        let s = Object.create(null)
        ;((s[e] = { handler: t, possibleKeys: [], score: 0 }), (this.#t = [s]))
      }
      this.#r = []
    }
    insert(e, t, i) {
      this.#n = ++this.#n
      let s = this,
        n = ya(t),
        o = []
      for (let a = 0, c = n.length; a < c; a++) {
        let d = n[a],
          l = n[a + 1],
          u = wa(d, l),
          f = Array.isArray(u) ? u[0] : d
        if (f in s.#e) {
          ;((s = s.#e[f]), u && o.push(u[1]))
          continue
        }
        ;((s.#e[f] = new ja()),
          u && (s.#r.push(u), o.push(u[1])),
          (s = s.#e[f]))
      }
      return (
        s.#t.push({
          [e]: {
            handler: i,
            possibleKeys: o.filter((a, c, d) => d.indexOf(a) === c),
            score: this.#n,
          },
        }),
        s
      )
    }
    #s(e, t, i, s, n) {
      for (let o = 0, a = t.#t.length; o < a; o++) {
        let c = t.#t[o],
          d = c[i] || c[se],
          l = {}
        if (
          d !== void 0 &&
          ((d.params = Object.create(null)),
          e.push(d),
          s !== pr || (n && n !== pr))
        )
          for (let u = 0, f = d.possibleKeys.length; u < f; u++) {
            let p = d.possibleKeys[u],
              h = l[d.score]
            ;((d.params[p] = n?.[p] && !h ? n[p] : (s[p] ?? n?.[p])),
              (l[d.score] = !0))
          }
      }
    }
    search(e, t) {
      let i = []
      this.#i = pr
      let n = [this],
        o = dn(t),
        a = [],
        c = o.length,
        d = null
      for (let l = 0; l < c; l++) {
        let u = o[l],
          f = l === c - 1,
          p = []
        for (let m = 0, w = n.length; m < w; m++) {
          let g = n[m],
            y = g.#e[u]
          y &&
            ((y.#i = g.#i),
            f
              ? (y.#e["*"] && this.#s(i, y.#e["*"], e, g.#i),
                this.#s(i, y, e, g.#i))
              : p.push(y))
          for (let v = 0, x = g.#r.length; v < x; v++) {
            let _ = g.#r[v],
              b = g.#i === pr ? {} : { ...g.#i }
            if (_ === "*") {
              let k = g.#e["*"]
              k && (this.#s(i, k, e, g.#i), (k.#i = b), p.push(k))
              continue
            }
            let [S, A, C] = _
            if (!u && !(C instanceof RegExp)) continue
            let P = g.#e[S]
            if (C instanceof RegExp) {
              if (d === null) {
                d = new Array(c)
                let T = t[0] === "/" ? 1 : 0
                for (let E = 0; E < c; E++) ((d[E] = T), (T += o[E].length + 1))
              }
              let k = t.substring(d[l]),
                D = C.exec(k)
              if (D) {
                if (
                  ((b[A] = D[0]),
                  this.#s(i, P, e, g.#i, b),
                  D[0].length === k.length &&
                    P.#e["*"] &&
                    this.#s(i, P.#e["*"], e, g.#i, b),
                  tf(P.#e))
                ) {
                  P.#i = b
                  let T = D[0].match(/\//)?.length ?? 0
                  ;(a[T] ||= []).push(P)
                }
                continue
              }
            }
            ;(C === !0 || C.test(u)) &&
              ((b[A] = u),
              f
                ? (this.#s(i, P, e, b, g.#i),
                  P.#e["*"] && this.#s(i, P.#e["*"], e, b, g.#i))
                : ((P.#i = b), p.push(P)))
          }
        }
        let h = a.shift()
        n = h ? p.concat(h) : p
      }
      return (
        i.length > 1 && i.sort((l, u) => l.score - u.score),
        [i.map(({ handler: l, params: u }) => [l, u])]
      )
    }
  }
var wn = class {
  name = "TrieRouter"
  #t
  constructor() {
    this.#t = new $a()
  }
  add(r, e, t) {
    let i = ei(e)
    if (i) {
      for (let s = 0, n = i.length; s < n; s++) this.#t.insert(r, i[s], t)
      return
    }
    this.#t.insert(r, e, t)
  }
  match(r, e) {
    return this.#t.search(r, e)
  }
}
var J = class extends Ia {
  constructor(r = {}) {
    ;(super(r),
      (this.router = r.router ?? new yn({ routers: [new ai(), new wn()] })))
  }
}
ti()
var za = (r) => {
  let e = {
      origin: "*",
      allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH", "QUERY"],
      allowHeaders: [],
      exposeHeaders: [],
      ...r,
    },
    t = ((s) =>
      typeof s == "string"
        ? s === "*"
          ? () => s
          : (n) => (s === n ? n : null)
        : typeof s == "function"
          ? s
          : (n) => (s.includes(n) ? n : null))(e.origin),
    i = ((s) =>
      typeof s == "function" ? s : Array.isArray(s) ? () => s : () => [])(
      e.allowMethods,
    )
  return async function (n, o) {
    function a(d, l) {
      n.res.headers.set(d, l)
    }
    let c = await t(n.req.header("origin") || "", n)
    if (
      (c && a("Access-Control-Allow-Origin", c),
      e.credentials && a("Access-Control-Allow-Credentials", "true"),
      e.exposeHeaders?.length &&
        a("Access-Control-Expose-Headers", e.exposeHeaders.join(",")),
      n.req.method === "OPTIONS")
    ) {
      ;(e.origin !== "*" && a("Vary", "Origin"),
        e.maxAge != null && a("Access-Control-Max-Age", e.maxAge.toString()))
      let d = await i(n.req.header("origin") || "", n)
      d.length && a("Access-Control-Allow-Methods", d.join(","))
      let l = e.allowHeaders
      if (!l?.length) {
        let u = n.req.header("Access-Control-Request-Headers")
        u && (l = u.split(",").map((f) => f.trim()))
      }
      return (
        l?.length &&
          (a("Access-Control-Allow-Headers", l.join(",")),
          n.res.headers.append("Vary", "Access-Control-Request-Headers")),
        n.res.headers.delete("Content-Length"),
        n.res.headers.delete("Content-Type"),
        new Response(null, {
          headers: n.res.headers,
          status: 204,
          statusText: "No Content",
        })
      )
    }
    ;(await o(), e.origin !== "*" && n.header("Vary", "Origin", { append: !0 }))
  }
}
te()
te()
fe()
function G(r, e, t) {
  let i = t !== "desc",
    s = String(e || "name").toLowerCase(),
    n = [...r]
  return (
    n.sort((o, a) => {
      if (o.is_dir !== a.is_dir) return o.is_dir ? -1 : 1
      let c
      return (
        s.includes("size")
          ? (c = (o.size || 0) - (a.size || 0))
          : s.includes("time") ||
              s.includes("modified") ||
              s.includes("created")
            ? (c =
                new Date(o.modified).getTime() - new Date(a.modified).getTime())
            : (c = String(o.name).localeCompare(String(a.name))),
        i ? c : -c
      )
    }),
    n
  )
}
var Ke = {
  global: {
    oauth: "https://login.microsoftonline.com",
    api: "https://graph.microsoft.com",
  },
  cn: {
    oauth: "https://login.partner.microsoftonline.cn",
    api: "https://microsoftgraph.chinacloudapi.cn",
  },
  us: {
    oauth: "https://login.microsoftonline.us",
    api: "https://graph.microsoft.us",
  },
  de: {
    oauth: "https://login.microsoftonline.de",
    api: "https://graph.microsoft.de",
  },
}
function Fn(r, e) {
  let t = ""
  return (
    r.thumbnails &&
      r.thumbnails.length > 0 &&
      (t = r.thumbnails[0].medium?.url || ""),
    {
      id: r.id,
      name: r.name,
      size: r.size,
      modified:
        r.lastModifiedDateTime || r.fileSystemInfo?.lastModifiedDateTime || "",
      isFolder: !!r.folder || !r.file,
      thumbnail: t,
      parentID: e,
      url: r["@microsoft.graph.downloadUrl"] || "",
    }
  )
}
async function Tn(r) {
  if (r.use_online_api && r.api_url_address) {
    let n = new URLSearchParams({
        refresh_ui: r.refresh_token,
        server_use: "true",
        driver_txt: "onedrive_pr",
      }).toString(),
      a = await (await fetch(`${r.api_url_address}?${n}`)).json()
    if (!a.refresh_token || !a.access_token)
      throw a.text
        ? new Error(`failed to refresh token: ${a.text}`)
        : new Error("empty token returned from official API")
    ;((r.accessToken = a.access_token),
      (r.refresh_token = a.refresh_token),
      r.onTokenUpdate?.(r.refresh_token))
    return
  }
  if (!r.client_id || !r.client_secret)
    throw new Error("empty ClientID or ClientSecret")
  let t = `${(Ke[r.region] || Ke.global).oauth}/common/oauth2/v2.0/token`,
    s = await (
      await fetch(t, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: r.client_id,
          client_secret: r.client_secret,
          redirect_uri: r.redirect_uri,
          refresh_token: r.refresh_token,
        }).toString(),
      })
    ).json()
  if (!s.refresh_token) throw new Error("Empty token")
  ;((r.refresh_token = s.refresh_token),
    (r.accessToken = s.access_token),
    r.onTokenUpdate?.(r.refresh_token))
}
async function Ce(r, e, t, i, s) {
  let n = {
      method: t.toUpperCase(),
      headers: {
        Authorization: `Bearer ${r.accessToken}`,
        ...(i !== void 0 ? { "Content-Type": "application/json" } : {}),
      },
      ...(i !== void 0 ? { body: JSON.stringify(i) } : {}),
    },
    o = await fetch(e, n)
  if (!o.ok) {
    let a
    try {
      a = (await o.json()).error
    } catch {
      a = null
    }
    let c = a?.code
    if (
      (c === "InvalidAuthenticationToken" ||
        c === "ExpiredAuthenticationToken" ||
        o.status === 401) &&
      !s
    )
      return (await Tn(r), Ce(r, e, t, i, !0))
    throw new Error(a?.message || `Request failed: ${o.status}`)
  }
  if (o.status !== 204) return o.json()
}
function uc(r, e, t) {
  let i = e.replace(/\\/g, "/")
  if (!i || i === "/") return t ? `${r}/drive/root/${t}` : `${r}/drive/root`
  let s = i.startsWith("/") ? i.slice(1) : i
  if ((s.endsWith("/") && (s = s.slice(0, -1)), !s || s === ""))
    return t ? `${r}/drive/root/${t}` : `${r}/drive/root`
  let n = s.split("/").map(encodeURIComponent).join("/")
  return t ? `${r}/drive/root:/${n}:/${t}` : `${r}/drive/root:/${n}:`
}
async function fc(r, e) {
  let t = Ke[r.region] || Ke.global,
    i = r.is_sharepoint
      ? `${t.api}/v1.0/sites/${r.site_id}`
      : `${t.api}/v1.0/me`,
    n = uc(
      i,
      e,
      "children?$top=1000&$expand=thumbnails($select=medium)&$select=id,name,size,fileSystemInfo,@microsoft.graph.downloadUrl,file,folder,parentReference",
    ),
    o = []
  for (; n; ) {
    let a = await Ce(r, n, "GET")
    ;(a.value && o.push(...a.value), (n = a["@odata.nextLink"]))
  }
  return o
}
async function pc(r, e) {
  let t = Ke[r.region] || Ke.global,
    i = r.is_sharepoint
      ? `${t.api}/v1.0/sites/${r.site_id}`
      : `${t.api}/v1.0/me`,
    s = uc(i, e)
  return Ce(r, s, "GET")
}
var mi = class {
  root_folder_path = "/"
  region = "global"
  is_sharepoint = !1
  use_online_api = !0
  api_url_address = "https://api.oplist.org/onedrive/renewapi"
  client_id = ""
  client_secret = ""
  redirect_uri = "https://api.oplist.org/onedrive/callback"
  refresh_token = ""
  site_id = ""
  chunk_size = 5
  custom_host = ""
  disable_disk_usage = !1
  enable_direct_upload = !1
  order_by = "filename"
  order_direction = "asc"
  accessToken = ""
  onTokenUpdate
  constructor(e, t) {
    ;(e && Object.assign(this, e), (this.onTokenUpdate = t))
  }
  async init() {
    ;(typeof this.is_sharepoint == "string" &&
      (this.is_sharepoint = this.is_sharepoint.toLowerCase() === "true"),
      typeof this.use_online_api == "string" &&
        (this.use_online_api = this.use_online_api.toLowerCase() === "true"),
      typeof this.chunk_size == "string" &&
        (this.chunk_size = parseInt(this.chunk_size) || 5),
      typeof this.disable_disk_usage == "string" &&
        (this.disable_disk_usage =
          this.disable_disk_usage.toLowerCase() === "true"),
      typeof this.enable_direct_upload == "string" &&
        (this.enable_direct_upload =
          this.enable_direct_upload.toLowerCase() === "true"),
      this.chunk_size < 1 && (this.chunk_size = 5),
      this.refresh_token && (await Tn(this)))
  }
  getMetaUrl(e, t, i) {
    let s = Ke[this.region] || Ke.global
    if (e) return s.oauth
    let n = this.is_sharepoint
        ? `${s.api}/v1.0/sites/${this.site_id}`
        : `${s.api}/v1.0/me`,
      o = t.replace(/\\/g, "/")
    if (!o || o === "/") return i ? `${n}/drive/root/${i}` : `${n}/drive/root`
    let a = o.startsWith("/") ? o.slice(1) : o
    if ((a.endsWith("/") && (a = a.slice(0, -1)), !a || a === ""))
      return i ? `${n}/drive/root/${i}` : `${n}/drive/root`
    let c = a
      .split("/")
      .map((d) => {
        try {
          return encodeURIComponent(decodeURIComponent(d))
        } catch {
          return encodeURIComponent(d)
        }
      })
      .join("/")
    return i ? `${n}/drive/root:/${c}:/${i}` : `${n}/drive/root:/${c}:`
  }
  async list(e, t) {
    let s = (await fc(this, t)).map((n) => {
      let o = Fn(n, ""),
        a = n["@microsoft.graph.downloadUrl"] || o.url || ""
      if (this.custom_host && a)
        try {
          let c = new URL(a)
          ;((c.host = this.custom_host), (a = c.toString()))
        } catch {}
      return {
        name: o.name,
        size: o.size,
        is_dir: o.isFolder,
        modified: o.modified,
        sign: "",
        type: o.isFolder ? 1 : 0,
        thumb: o.thumbnail || "",
        raw_url: a,
      }
    })
    return G(s, this.order_by, this.order_direction)
  }
  async get(e, t) {
    let i = await pc(this, t),
      s = Fn(i, ""),
      n = i["@microsoft.graph.downloadUrl"] || s.url || ""
    if (this.custom_host && n)
      try {
        let o = new URL(n)
        ;((o.host = this.custom_host), (n = o.toString()))
      } catch {}
    return {
      name: s.name,
      size: s.size,
      is_dir: s.isFolder,
      modified: s.modified,
      sign: "",
      type: s.isFolder ? 1 : 0,
      thumb: s.thumbnail || "",
      raw_url: n,
    }
  }
  async mkdir(e, t) {
    let i = t.split("/").slice(0, -1).join("/") || "/",
      s = t.split("/").filter(Boolean).pop() || "",
      n = this.getMetaUrl(!1, i, "children")
    await Ce(this, n, "POST", {
      name: s,
      folder: {},
      "@microsoft.graph.conflictBehavior": "rename",
    })
  }
  async rename(e, t, i) {
    let s = { name: i },
      n = this.getMetaUrl(!1, t)
    await Ce(this, n, "PATCH", s)
  }
  async remove(e, t, i) {
    for (let s of i) {
      let n = t === "/" ? `/${s}` : `${t}/${s}`,
        o = this.getMetaUrl(!1, n)
      await Ce(this, o, "DELETE")
    }
  }
  async move(e, t, i, s, n) {
    let o = this.getMetaUrl(!1, n),
      a = await Ce(this, o, "GET"),
      c = a.id,
      d = a.parentReference?.driveId
    for (let l of i) {
      let u = s === "/" ? `/${l}` : `${s}/${l}`,
        f = {
          parentReference: { id: c, ...(d ? { driveId: d } : {}) },
          name: l,
        },
        p = this.getMetaUrl(!1, u)
      await Ce(this, p, "PATCH", f)
    }
  }
  async copy(e, t, i, s, n) {
    let o = this.getMetaUrl(!1, n),
      a = await Ce(this, o, "GET"),
      c = a.id,
      d = a.parentReference?.driveId
    for (let l of i) {
      let u = s === "/" ? `/${l}` : `${s}/${l}`,
        f = {
          parentReference: { id: c, ...(d ? { driveId: d } : {}) },
          name: l,
        },
        p = this.getMetaUrl(!1, u, "copy")
      await Ce(this, p, "POST", f)
    }
  }
  async put(e, t, i) {
    if (i.length <= 4 * 1024 * 1024) {
      let s = this.getMetaUrl(!1, t, "content")
      await Ce(this, s, "PUT", i)
    } else {
      let s = this.getMetaUrl(!1, t, "createUploadSession"),
        a = (
          await Ce(this, s, "POST", {
            item: { "@microsoft.graph.conflictBehavior": "rename" },
          })
        ).uploadUrl,
        c = this.chunk_size * 1024 * 1024,
        d = 0,
        l = i.length
      for (; d < l; ) {
        let u = l - d,
          f = Math.min(u, c),
          p = i.slice(d, d + f)
        ;(await fetch(a, {
          method: "PUT",
          headers: {
            "Content-Length": String(f),
            "Content-Range": `bytes ${d}-${d + f - 1}/${l}`,
          },
          body: p,
        }),
          (d += f))
      }
    }
  }
}
function In(r, e) {
  let t = ""
  return (
    r.thumbnails &&
      r.thumbnails.length > 0 &&
      (t = r.thumbnails[0].medium?.url || ""),
    {
      id: r.id,
      name: r.name,
      size: r.size,
      modified:
        r.lastModifiedDateTime || r.fileSystemInfo?.lastModifiedDateTime || "",
      isFolder: !!r.folder || !r.file,
      thumbnail: t,
      parentID: e,
      url: r["@microsoft.graph.downloadUrl"] || "",
    }
  )
}
var bt = {
  global: {
    oauth: "https://login.microsoftonline.com",
    api: "https://graph.microsoft.com",
  },
  cn: {
    oauth: "https://login.chinacloudapi.cn",
    api: "https://microsoftgraph.chinacloudapi.cn",
  },
  us: {
    oauth: "https://login.microsoftonline.us",
    api: "https://graph.microsoft.us",
  },
  de: {
    oauth: "https://login.microsoftonline.de",
    api: "https://graph.microsoft.de",
  },
}
function Ee(r, e, t, i) {
  let s = bt[r.region] || bt.global
  if (e) return s.oauth
  let n = t ? t.replace(/\\/g, "/") : ""
  if (!n || n === "/")
    return i
      ? `${s.api}/v1.0/users/${r.email}/drive/root/${i}`
      : `${s.api}/v1.0/users/${r.email}/drive/root`
  let o = n.startsWith("/") ? n.slice(1) : n
  if ((o.endsWith("/") && (o = o.slice(0, -1)), !o || o === ""))
    return i
      ? `${s.api}/v1.0/users/${r.email}/drive/root/${i}`
      : `${s.api}/v1.0/users/${r.email}/drive/root`
  let a = o
    .split("/")
    .map((c) => {
      try {
        return encodeURIComponent(decodeURIComponent(c))
      } catch {
        return encodeURIComponent(c)
      }
    })
    .join("/")
  return i
    ? `${s.api}/v1.0/users/${r.email}/drive/root:/${a}:/${i}`
    : `${s.api}/v1.0/users/${r.email}/drive/root:/${a}:`
}
async function Bn(r) {
  let e = null
  for (let t = 0; t < 3; t++)
    try {
      await jf(r)
      return
    } catch (i) {
      e = i
    }
  throw e || new Error("Failed to get access token")
}
async function jf(r) {
  if (!r.client_id || !r.client_secret)
    throw new Error("empty client_id or client_secret")
  if (!r.tenant_id) throw new Error("empty tenant_id")
  let e = bt[r.region] || bt.global,
    t = `${e.oauth}/${r.tenant_id}/oauth2/token`,
    i = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: r.client_id,
      client_secret: r.client_secret,
      resource: `${e.api}/`,
      scope: `${e.api}/.default`,
    }).toString(),
    n = await (
      await fetch(t, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: i,
      })
    ).json()
  if (n.error) throw new Error(n.error_description || n.error)
  if (!n.access_token)
    throw new Error("empty token returned from Microsoft identity platform")
  ;((r.accessToken = n.access_token), r.onTokenUpdate?.(r.accessToken))
}
async function xe(r, e, t, i, s) {
  let n =
      i !== void 0 &&
      (typeof i == "string" ||
        i instanceof Uint8Array ||
        i instanceof ArrayBuffer ||
        (typeof Buffer < "u" && Buffer.isBuffer(i))),
    o = {
      method: t.toUpperCase(),
      headers: {
        Authorization: `Bearer ${r.accessToken}`,
        ...(i !== void 0 && !n ? { "Content-Type": "application/json" } : {}),
      },
      ...(i !== void 0 ? { body: n ? i : JSON.stringify(i) } : {}),
    },
    a = await fetch(e, o)
  if (!a.ok) {
    let c
    try {
      c = (await a.json()).error
    } catch {
      c = null
    }
    let d = c?.code
    if (
      (d === "InvalidAuthenticationToken" ||
        d === "ExpiredAuthenticationToken" ||
        a.status === 401) &&
      !s
    )
      return (await Bn(r), xe(r, e, t, i, !0))
    throw new Error(c?.message || `Request failed: ${a.status}`)
  }
  if (a.status !== 204) return a.json()
}
async function hc(r, e) {
  let i = Ee(
      r,
      !1,
      e,
      "children?$top=1000&$expand=thumbnails($select=medium)&$select=id,name,size,fileSystemInfo,lastModifiedDateTime,@microsoft.graph.downloadUrl,file,folder,parentReference",
    ),
    s = []
  for (; i; ) {
    let n = await xe(r, i, "GET")
    ;(n.value && s.push(...n.value), (i = n["@odata.nextLink"]))
  }
  return s
}
async function gc(r, e) {
  let t = Ee(r, !1, e)
  return xe(r, t, "GET")
}
async function mc(r) {
  let t = `${(bt[r.region] || bt.global).api}/v1.0/users/${r.email}/drive`
  return xe(r, t, "GET", void 0, !0)
}
async function yc(r, e) {
  let t = Ee(r, !1, e, "createUploadSession"),
    n = (
      await xe(r, t, "POST", {
        item: { "@microsoft.graph.conflictBehavior": "rename" },
      })
    ).uploadUrl
  if (!n) throw new Error("failed to get upload URL from response")
  return {
    UploadURL: n,
    ChunkSize: (r.chunk_size || 5) * 1024 * 1024,
    Method: "PUT",
  }
}
var yi = class {
  root_folder_path = "/"
  region = "global"
  client_id = ""
  client_secret = ""
  tenant_id = ""
  email = ""
  chunk_size = 5
  custom_host = ""
  disable_disk_usage = !1
  enable_direct_upload = !1
  order_by = "filename"
  order_direction = "asc"
  accessToken = ""
  onTokenUpdate
  constructor(e, t) {
    ;(e && Object.assign(this, e), (this.onTokenUpdate = t))
  }
  async init() {
    ;(typeof this.chunk_size == "string" &&
      (this.chunk_size = parseInt(this.chunk_size) || 5),
      typeof this.disable_disk_usage == "string" &&
        (this.disable_disk_usage =
          this.disable_disk_usage.toLowerCase() === "true"),
      typeof this.enable_direct_upload == "string" &&
        (this.enable_direct_upload =
          this.enable_direct_upload.toLowerCase() === "true"),
      this.chunk_size < 1 && (this.chunk_size = 5),
      this.client_id &&
        this.client_secret &&
        this.tenant_id &&
        (await Bn(this)))
  }
  async list(e, t) {
    let s = (await hc(this, t)).map((n) => {
      let o = In(n, ""),
        a = n["@microsoft.graph.downloadUrl"] || o.url || ""
      if (this.custom_host && a)
        try {
          let c = new URL(a)
          ;((c.host = this.custom_host), (a = c.toString()))
        } catch {}
      return {
        name: o.name,
        size: o.size,
        is_dir: o.isFolder,
        modified: o.modified,
        sign: "",
        type: o.isFolder ? 1 : 0,
        thumb: o.thumbnail || "",
        raw_url: a,
      }
    })
    return G(s, this.order_by, this.order_direction)
  }
  async get(e, t) {
    let i = await gc(this, t),
      s = In(i, ""),
      n = i["@microsoft.graph.downloadUrl"] || s.url || ""
    if (this.custom_host && n)
      try {
        let o = new URL(n)
        ;((o.host = this.custom_host), (n = o.toString()))
      } catch {}
    return {
      name: s.name,
      size: s.size,
      is_dir: s.isFolder,
      modified: s.modified,
      sign: "",
      type: s.isFolder ? 1 : 0,
      thumb: s.thumbnail || "",
      raw_url: n,
    }
  }
  async mkdir(e, t) {
    let i = t.split("/").slice(0, -1).join("/") || "/",
      s = t.split("/").filter(Boolean).pop() || "",
      n = Ee(this, !1, i, "children")
    await xe(this, n, "POST", {
      name: s,
      folder: {},
      "@microsoft.graph.conflictBehavior": "rename",
    })
  }
  async rename(e, t, i) {
    let s = { name: i },
      n = Ee(this, !1, t)
    await xe(this, n, "PATCH", s)
  }
  async remove(e, t, i) {
    for (let s of i) {
      let n = t === "/" ? `/${s}` : `${t}/${s}`,
        o = Ee(this, !1, n)
      await xe(this, o, "DELETE")
    }
  }
  async move(e, t, i, s, n) {
    let o = Ee(this, !1, n),
      a = await xe(this, o, "GET"),
      c = a.id,
      d = a.parentReference?.driveId
    for (let l of i) {
      let u = s === "/" ? `/${l}` : `${s}/${l}`,
        f = {
          parentReference: { id: c, ...(d ? { driveId: d } : {}) },
          name: l,
        },
        p = Ee(this, !1, u)
      await xe(this, p, "PATCH", f)
    }
  }
  async copy(e, t, i, s, n) {
    let o = Ee(this, !1, n),
      a = await xe(this, o, "GET"),
      c = a.id,
      d = a.parentReference?.driveId
    for (let l of i) {
      let u = s === "/" ? `/${l}` : `${s}/${l}`,
        f = {
          parentReference: { id: c, ...(d ? { driveId: d } : {}) },
          name: l,
        },
        p = Ee(this, !1, u, "copy")
      await xe(this, p, "POST", f)
    }
  }
  async put(e, t, i) {
    if (i.length <= 4 * 1024 * 1024) {
      let s = Ee(this, !1, t, "content")
      await xe(this, s, "PUT", i)
    } else {
      let s = Ee(this, !1, t, "createUploadSession"),
        a = (
          await xe(this, s, "POST", {
            item: { "@microsoft.graph.conflictBehavior": "rename" },
          })
        ).uploadUrl,
        c = this.chunk_size * 1024 * 1024,
        d = 0,
        l = i.length
      for (; d < l; ) {
        let u = l - d,
          f = Math.min(u, c),
          p = i.slice(d, d + f)
        ;(await fetch(a, {
          method: "PUT",
          headers: {
            "Content-Length": String(f),
            "Content-Range": `bytes ${d}-${d + f - 1}/${l}`,
          },
          body: p,
        }),
          (d += f))
      }
    }
  }
  async getDetails() {
    if (this.disable_disk_usage) return {}
    let e = await mc(this)
    return { total: e.quota.total, used: e.quota.used, free: e.quota.remaining }
  }
  async getDirectUploadInfo(e) {
    if (!this.enable_direct_upload)
      throw new Error("Direct upload is not enabled")
    return yc(this, e)
  }
}
fe()
var zf = "https://openapi.aliyundrive.com/adrive/v1.0",
  wi = class {
    addition
    accessToken = ""
    refreshTokenVal = ""
    driveId = ""
    tokenExpiresAt = 0
    constructor(e) {
      ;((this.addition = e),
        (this.refreshTokenVal = e.refresh_token || ""),
        (this.driveId = e.drive_id || ""))
    }
    async init() {
      if (!this.refreshTokenVal || !this.refreshTokenVal.trim()) {
        console.warn("[AliyundriveOpen] refresh_token is empty, skipping init.")
        return
      }
      try {
        ;(await this.refreshAccessToken(),
          this.driveId || (await this.resolveDriveId()))
      } catch (e) {
        console.warn("[AliyundriveOpen] init warning:", e.message)
      }
    }
    async resolveDriveId(e = !1) {
      if (!e && this.addition.drive_id && this.addition.drive_id.trim()) {
        this.driveId = this.addition.drive_id.trim()
        return
      }
      try {
        let t = await this.openApiRequest("/user/getDriveInfo", {}),
          i = e ? "resource" : this.addition.drive_type || "resource",
          s = ""
        ;(i === "resource" && t.resource_drive_id
          ? (s = t.resource_drive_id)
          : i === "backup" && t.backup_drive_id
            ? (s = t.backup_drive_id)
            : i === "default" && t.default_drive_id && (s = t.default_drive_id),
          s ||
            (s =
              t.resource_drive_id ||
              t.default_drive_id ||
              t.backup_drive_id ||
              ""),
          (this.driveId = s),
          console.log(
            `[AliyundriveOpen] Resolved drive_id: ${this.driveId} (driveType: ${i})`,
          ))
      } catch (t) {
        console.warn("[AliyundriveOpen] resolveDriveId failed:", t.message)
      }
    }
    async refreshAccessToken() {
      if (!this.refreshTokenVal || !this.refreshTokenVal.trim()) return
      let e = this.refreshTokenVal.trim(),
        t = []
      ;(this.addition.api_url_address &&
        this.addition.api_url_address.trim() &&
        t.push(this.addition.api_url_address.trim()),
        t.push(
          "https://api.oplist.org/alicloud/renewapi",
          "https://api.oplist.org/ali_open/token",
          "https://api.oplist.org/aliyundrive/token",
          "https://api.alist.nn.ci/alist/ali_open/token",
          "https://api.alist.nn.ci/aliyundrive/token",
          "https://api-sam.oplist.org/aliyundrive/token",
        ))
      let i =
        this.addition.alipan_type === "alipanTV" ? "alicloud_tv" : "alicloud_qr"
      for (let o of t)
        try {
          let a = new URLSearchParams({
              refresh_ui: e,
              refresh_token: e,
              server_use: "true",
              driver_txt: i,
            }),
            c = await fetch(`${o}?${a.toString()}`, {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            })
          if (!c.ok) throw new Error(`[Status ${c.status}]`)
          let d = await c.json(),
            l = d.refresh_token || d.data?.refresh_token || "",
            u = d.access_token || d.data?.access_token || ""
          if (!u)
            throw new Error(
              `Empty access_token from online API: ${JSON.stringify(d)}`,
            )
          ;((this.accessToken = u),
            l && (this.refreshTokenVal = l),
            (this.tokenExpiresAt =
              Date.now() + (d.expires_in || 7200) * 1e3 - 6e4))
          return
        } catch (a) {
          console.warn(
            `[AliyundriveOpen] Online API '${o}' failed: ${a.message}`,
          )
        }
      let s =
          (this.addition.client_id || "").trim() ||
          "25ab4837190e48718a28f80073574a4d",
        n = (this.addition.client_secret || "").trim()
      try {
        let o = { grant_type: "refresh_token", refresh_token: e, client_id: s }
        n && (o.client_secret = n)
        let a = await fetch(
          "https://openapi.aliyundrive.com/oauth/access_token",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(o),
          },
        )
        if (!a.ok) {
          let d = await a.text().catch(() => "")
          throw new Error(`[Status ${a.status}] ${d}`)
        }
        let c = await a.json()
        if (!c.access_token)
          throw new Error(`Invalid response: ${JSON.stringify(c)}`)
        ;((this.accessToken = c.access_token),
          c.refresh_token && (this.refreshTokenVal = c.refresh_token),
          (this.tokenExpiresAt =
            Date.now() + (c.expires_in || 7200) * 1e3 - 6e4))
        return
      } catch (o) {
        console.warn(`[AliyundriveOpen] Direct OAuth failed: ${o.message}`)
      }
      throw new Error(
        "[AliyundriveOpen] All token refresh strategies failed. Please check: 1) refresh_token is valid and not expired, 2) api_url_address is accessible, 3) If using direct OAuth, client_id and client_secret are correct.",
      )
    }
    async ensureToken() {
      ;(!this.accessToken || Date.now() >= this.tokenExpiresAt) &&
        (await this.refreshAccessToken())
    }
    getRootFolderId() {
      return this.addition.root_folder_id?.trim() || "root"
    }
    async openApiRequest(e, t, i = !0) {
      await this.ensureToken()
      let s = e.startsWith("http") ? e : `${zf}${e}`,
        n = await fetch(s, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify(t),
        })
      if (n.status === 401 && i)
        return (await this.refreshAccessToken(), this.openApiRequest(e, t, !1))
      if (!n.ok) {
        let o = await n.text().catch(() => "")
        throw new Error(`[AliyundriveOpen] API error [${n.status}] ${e}: ${o}`)
      }
      return n.json()
    }
    async listFiles(e) {
      this.driveId || (await this.resolveDriveId())
      let t = [],
        i,
        s = this.addition.order_by || "updated_at",
        n = this.addition.order_direction || "DESC"
      do {
        let o = {
          drive_id: this.driveId,
          parent_file_id: e,
          limit: 100,
          order_by: s,
          order_direction: n,
        }
        i && (o.marker = i)
        let a
        try {
          a = await this.openApiRequest("/openFile/list", o)
        } catch (c) {
          if (c.message?.includes("UserNotAllowedAccessDrive"))
            (console.warn(
              `[AliyundriveOpen] UserNotAllowedAccessDrive for drive ${this.driveId}, auto re-resolving drive_id...`,
            ),
              await this.resolveDriveId(!0),
              (o.drive_id = this.driveId),
              (a = await this.openApiRequest("/openFile/list", o)))
          else throw c
        }
        ;(t.push(...(a.items || [])), (i = a.next_marker || void 0))
      } while (i)
      return t
    }
    async getFile(e) {
      return (
        this.driveId || (await this.resolveDriveId()),
        this.openApiRequest("/openFile/get", {
          drive_id: this.driveId,
          file_id: e,
        })
      )
    }
    async getDownloadUrl(e) {
      let t = await this.openApiRequest("/openFile/getDownloadUrl", {
        drive_id: this.driveId,
        file_id: e,
        expire_sec: 14400,
      })
      return t.url || t.download_url || ""
    }
    async mkdir(e, t) {
      await this.openApiRequest("/openFile/create", {
        drive_id: this.driveId,
        parent_file_id: e,
        name: t,
        type: "folder",
        check_name_mode: "refuse",
      })
    }
    async rename(e, t) {
      await this.openApiRequest("/openFile/update", {
        drive_id: this.driveId,
        file_id: e,
        name: t,
        check_name_mode: "refuse",
      })
    }
    async remove(e) {
      let t = this.addition.remove_way || "trash"
      await this.openApiRequest(
        t === "trash" ? "/openFile/recyclebin" : "/openFile/delete",
        { drive_id: this.driveId, file_id: e },
      )
    }
    async move(e, t) {
      await this.openApiRequest("/openFile/move", {
        drive_id: this.driveId,
        file_id: e,
        to_parent_file_id: t,
        check_name_mode: "refuse",
      })
    }
    async copy(e, t) {
      await this.openApiRequest("/openFile/copy", {
        drive_id: this.driveId,
        file_id: e,
        to_parent_file_id: t,
        auto_rename: !0,
      })
    }
    async putFile(e, t, i) {
      let s = i.length,
        n = await this.openApiRequest("/openFile/create", {
          drive_id: this.driveId,
          parent_file_id: e,
          name: t,
          type: "file",
          size: s,
          check_name_mode: "auto_rename",
          part_info_list: [{ part_number: 1 }],
        }),
        o = n.part_info_list?.[0]?.upload_url
      if (!o) return
      let a = await fetch(o, { method: "PUT", body: i })
      if (!a.ok) throw new Error(`[AliyundriveOpen] Upload failed: ${a.status}`)
      await this.openApiRequest("/openFile/complete", {
        drive_id: this.driveId,
        file_id: n.file_id,
        upload_id: n.upload_id,
      })
    }
  }
function wc(r) {
  let e = r.type === "folder"
  return {
    name: r.name,
    size: r.size || 0,
    is_dir: e,
    modified: r.updated_at || r.created_at || new Date().toISOString(),
    sign: "",
    type: L(r.name, e),
    thumb: r.thumbnail || "",
    raw_url: r.download_url || "",
  }
}
var xi = class {
  client
  addition
  pathFileIdCache = new Map()
  constructor(e) {
    ;((this.addition = e), (this.client = new wi(e)))
  }
  async init() {
    await this.client.init()
  }
  async list(e, t) {
    let i = await this.resolveFileId(t),
      n = (await this.client.listFiles(i)).map(wc)
    return G(n, this.addition.order_by, this.addition.order_direction)
  }
  async get(e, t) {
    let i = await this.resolveFileId(t),
      s = await this.client.getFile(i).catch(() => null),
      n = await this.client.getDownloadUrl(i).catch(() => "")
    if (s) {
      let c = wc(s)
      return ((c.raw_url = n || c.raw_url), c)
    }
    try {
      await this.client.listFiles(i)
      let c = t.split("/").filter(Boolean)
      return {
        name: c[c.length - 1] || "root",
        size: 0,
        is_dir: !0,
        modified: new Date().toISOString(),
        sign: "",
        type: 1,
        raw_url: "",
      }
    } catch {}
    let o = t.split("/").filter(Boolean)
    return {
      name: o[o.length - 1] || "root",
      size: 0,
      is_dir: !1,
      modified: new Date().toISOString(),
      sign: "",
      type: 0,
      raw_url: n,
    }
  }
  async mkdir(e, t) {
    let i = t.split("/").filter(Boolean),
      s = i.pop() || "\u65B0\u6587\u4EF6\u5939",
      n = "/" + i.join("/"),
      o = await this.resolveFileId(n)
    await this.client.mkdir(o, s)
  }
  async rename(e, t, i) {
    let s = await this.resolveFileId(t)
    await this.client.rename(s, i)
  }
  async remove(e, t, i) {
    let s = await this.resolveFileId(t)
    await this.client.remove(s)
  }
  async move(e, t, i, s, n) {
    let o = await this.resolveFileId(s),
      a = await this.resolveFileId(t)
    await this.client.move(o, a)
  }
  async copy(e, t, i, s, n) {
    let o = await this.resolveFileId(s),
      a = await this.resolveFileId(t)
    await this.client.copy(o, a)
  }
  async put(e, t, i) {
    let s = t.split("/").filter(Boolean),
      n = s.pop() || "upload",
      o = "/" + s.join("/"),
      a = await this.resolveFileId(o)
    await this.client.putFile(a, n, i)
  }
  async resolveFileId(e) {
    let t = e.split("/").filter(Boolean).join("/")
    if (!t) return this.client.getRootFolderId()
    if (this.pathFileIdCache.has(t)) return this.pathFileIdCache.get(t)
    let i = t.split("/"),
      s = this.client.getRootFolderId()
    for (let n = 0; n < i.length; n++) {
      let o = i[n],
        a = (() => {
          try {
            return decodeURIComponent(o)
          } catch {
            return o
          }
        })(),
        c = i.slice(0, n + 1).join("/")
      if (this.pathFileIdCache.has(c)) {
        s = this.pathFileIdCache.get(c)
        continue
      }
      let l = (await this.client.listFiles(s)).find(
        (u) => u.name === o || u.name === a || u.file_id === o,
      )
      if (!l) throw new Error(`[AliyundriveOpen] Path '${o}' not found`)
      ;((s = l.file_id), this.pathFileIdCache.set(c, s))
    }
    return s
  }
}
var br = "application/vnd.google-apps.folder",
  xc = "application/vnd.google-apps.shortcut",
  _c =
    "files(id,name,mimeType,size,modifiedTime,createdTime,thumbnailLink,shortcutDetails,md5Checksum,sha1Checksum,sha256Checksum),nextPageToken"
var lt = "https://www.googleapis.com/drive/v3",
  vc = "https://www.googleapis.com/upload/drive/v3",
  Lf = "https://oauth2.googleapis.com/token",
  _i = class {
    addition
    accessToken = ""
    refreshTokenVal = ""
    tokenExpiresAt = 0
    constructor(e) {
      ;((this.addition = e), (this.refreshTokenVal = e.refresh_token || ""))
    }
    getRootFolderId() {
      return this.addition.root_folder_id?.trim() || "root"
    }
    async init() {
      if (!this.refreshTokenVal || !this.refreshTokenVal.trim()) {
        console.warn("[GoogleDrive] refresh_token is empty, skipping init.")
        return
      }
      try {
        await this.refreshAccessToken()
      } catch (e) {
        console.warn("[GoogleDrive] init token refresh warning:", e.message)
      }
    }
    async refreshAccessToken() {
      let e = this.refreshTokenVal.trim()
      if (!e) return
      let t = this.addition.use_online_api !== !1,
        i = []
      t &&
        (this.addition.api_url_address?.trim() &&
          i.push(this.addition.api_url_address.trim()),
        i.push(
          "https://api.oplist.org/google/token",
          "https://api.oplist.org/google/renewapi",
          "https://api.oplist.org/googledrive/token",
          "https://api-sam.oplist.org/google/token",
          "https://api-sam.oplist.org/googledrive/token",
          "https://api.alist.nn.ci/google/token",
          "https://api.alist.nn.ci/googledrive/token",
        ))
      for (let o of i)
        try {
          let a = new URLSearchParams({
              refresh_ui: e,
              server_use: "true",
              driver_txt: "googleui_go",
            }),
            c = await fetch(`${o}?${a.toString()}`, { method: "GET" })
          if (!c.ok) throw new Error(`[Status ${c.status}]`)
          let d = await c.json(),
            l = d.access_token || d.data?.access_token || "",
            u = d.refresh_token || d.data?.refresh_token || ""
          if (!l) {
            let f = d.text || d.error || "empty access_token"
            throw new Error(f)
          }
          ;((this.accessToken = l),
            u && (this.refreshTokenVal = u),
            (this.tokenExpiresAt =
              Date.now() + (d.expires_in || 3600) * 1e3 - 6e4))
          return
        } catch (a) {
          console.warn(`[GoogleDrive] Online API '${o}' failed: ${a.message}`)
        }
      let s =
          (this.addition.client_id || "").trim() ||
          "202264815644-2n82p2e49c7o6026u87j9e22v1n25c27.apps.googleusercontent.com",
        n =
          (this.addition.client_secret || "").trim() ||
          "GOCSPX-4bH5Kx3s_89_j6j2x-2x3-8x"
      if (s && n)
        try {
          let o = await fetch(Lf, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: s,
              client_secret: n,
              refresh_token: e,
              grant_type: "refresh_token",
            }).toString(),
          })
          if (!o.ok) {
            let c = await o.text().catch(() => "")
            throw new Error(`[Status ${o.status}] ${c}`)
          }
          let a = await o.json()
          if (!a.access_token)
            throw new Error(`Invalid OAuth response: ${JSON.stringify(a)}`)
          ;((this.accessToken = a.access_token),
            a.refresh_token && (this.refreshTokenVal = a.refresh_token),
            (this.tokenExpiresAt =
              Date.now() + (a.expires_in || 3600) * 1e3 - 6e4))
          return
        } catch (o) {
          console.warn(`[GoogleDrive] Direct OAuth failed: ${o.message}`)
        }
      throw new Error(
        "[GoogleDrive] All token refresh strategies failed. Please check: 1) refresh_token is valid, 2) api_url_address is accessible, 3) If using direct OAuth: client_id and client_secret are correct.",
      )
    }
    async ensureToken() {
      ;(!this.accessToken || Date.now() >= this.tokenExpiresAt) &&
        (await this.refreshAccessToken())
    }
    async request(e, t = {}, i = !0) {
      await this.ensureToken()
      let s = await fetch(e, {
        ...t,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          ...(t.headers || {}),
        },
      })
      if (s.status === 401 && i)
        return (
          console.warn("[GoogleDrive] 401 Unauthorized, refreshing token..."),
          await this.refreshAccessToken(),
          this.request(e, t, !1)
        )
      if (!s.ok) {
        let n = await s.text().catch(() => "")
        throw new Error(`[GoogleDrive] API error [${s.status}]: ${n}`)
      }
      return s.status === 204 ? null : s.json()
    }
    async listFiles(e) {
      let t = [],
        i,
        s = this.addition.order_by || "folder,name,modifiedTime desc"
      do {
        let n = new URLSearchParams({
          q: `'${e}' in parents and trashed = false`,
          fields: _c,
          orderBy: s,
          pageSize: "1000",
          includeItemsFromAllDrives: "true",
          supportsAllDrives: "true",
        })
        i && n.set("pageToken", i)
        let o = `${lt}/files?${n.toString()}`,
          a = await this.request(o),
          c = a.files || []
        for (let d of c)
          d.mimeType === xc &&
            d.shortcutDetails?.targetId &&
            ((d.id = d.shortcutDetails.targetId),
            (d.mimeType = d.shortcutDetails.targetMimeType || d.mimeType))
        ;(t.push(...c), (i = a.nextPageToken))
      } while (i)
      return t
    }
    async getFile(e) {
      let t = new URLSearchParams({
        fields: "id,name,mimeType,size,modifiedTime,md5Checksum",
        includeItemsFromAllDrives: "true",
        supportsAllDrives: "true",
      })
      return this.request(`${lt}/files/${e}?${t.toString()}`)
    }
    getDownloadUrl(e) {
      return `${lt}/files/${e}?includeItemsFromAllDrives=true&supportsAllDrives=true&alt=media&acknowledgeAbuse=true`
    }
    getDownloadHeaders() {
      return { Authorization: `Bearer ${this.accessToken}` }
    }
    async mkdir(e, t) {
      await this.request(`${lt}/files?supportsAllDrives=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: t, parents: [e], mimeType: br }),
      })
    }
    async rename(e, t) {
      await this.request(`${lt}/files/${e}?supportsAllDrives=true`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: t }),
      })
    }
    async remove(e) {
      await this.request(`${lt}/files/${e}?supportsAllDrives=true`, {
        method: "DELETE",
      })
    }
    async move(e, t, i) {
      let s = new URLSearchParams({
        addParents: i,
        removeParents: t,
        supportsAllDrives: "true",
      })
      await this.request(`${lt}/files/${e}?${s.toString()}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
    }
    async copy(e, t, i) {
      await this.request(`${lt}/files/${e}/copy?supportsAllDrives=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: i, parents: [t] }),
      })
    }
    async putFile(e, t, i, s = "application/octet-stream") {
      let n = (this.addition.chunk_size || 5) * 1024 * 1024
      if (i.length <= n) {
        let o = new URLSearchParams({
            uploadType: "multipart",
            supportsAllDrives: "true",
          }),
          a = `----GoogleDriveBoundary${Date.now()}`,
          c = JSON.stringify({ name: t, parents: [e] }),
          d = `--${a}\r
Content-Type: application/json\r
\r
${c}\r
--${a}\r
Content-Type: ${s}\r
\r
`,
          l = Buffer.from(d),
          u = Buffer.from(`\r
--${a}--`),
          f = Buffer.concat([l, i, u])
        await this.request(`${vc}/files?${o.toString()}`, {
          method: "POST",
          headers: { "Content-Type": `multipart/related; boundary=${a}` },
          body: f,
        })
      } else {
        let o = new URLSearchParams({
          uploadType: "resumable",
          supportsAllDrives: "true",
        })
        await this.ensureToken()
        let a = await fetch(`${vc}/files?${o.toString()}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
            "X-Upload-Content-Type": s,
            "X-Upload-Content-Length": String(i.length),
          },
          body: JSON.stringify({ name: t, parents: [e] }),
        })
        if (!a.ok)
          throw new Error(
            `[GoogleDrive] Resumable upload init failed: ${a.status}`,
          )
        let c = a.headers.get("location")
        if (!c) throw new Error("[GoogleDrive] No upload URL returned")
        let d = 0
        for (; d < i.length; ) {
          let l = i.slice(d, d + n),
            u = d + l.length - 1,
            f = await fetch(c, {
              method: "PUT",
              headers: {
                "Content-Range": `bytes ${d}-${u}/${i.length}`,
                "Content-Type": s,
              },
              body: l,
            })
          if (!f.ok && f.status !== 308)
            throw new Error(`[GoogleDrive] Chunk upload failed: ${f.status}`)
          d += l.length
        }
      }
    }
    pathCache = new Map()
    async resolveFileId(e) {
      let t = e.split("/").filter(Boolean).join("/")
      if (!t) return this.getRootFolderId()
      if (this.pathCache.has(t)) return this.pathCache.get(t)
      let i = t.split("/"),
        s = this.getRootFolderId()
      for (let n = 0; n < i.length; n++) {
        let o = i[n],
          a = (() => {
            try {
              return decodeURIComponent(o)
            } catch {
              return o
            }
          })(),
          c = i.slice(0, n + 1).join("/")
        if (this.pathCache.has(c)) {
          s = this.pathCache.get(c)
          continue
        }
        let l = (await this.listFiles(s)).find(
          (u) => u.name === o || u.name === a || u.id === o,
        )
        if (!l) throw new Error(`[GoogleDrive] Path '${o}' not found`)
        ;((s = l.id), this.pathCache.set(c, s))
      }
      return s
    }
    async resolveParentAndName(e) {
      let t = e.split("/").filter(Boolean),
        i = t.pop() || "unnamed",
        s = "/" + t.join("/")
      return { parentId: await this.resolveFileId(s), name: i }
    }
  }
function bc(r) {
  return {
    name: r.name,
    size: r.size ? parseInt(r.size, 10) : 0,
    is_dir: r.mimeType === br,
    modified: r.modifiedTime || r.createdTime || new Date().toISOString(),
    sign: "",
    type: r.mimeType === br ? 1 : 0,
    thumb: r.thumbnailLink || "",
    raw_url: "",
  }
}
var vi = class {
  client
  addition
  constructor(e) {
    ;((this.addition = e), (this.client = new _i(e)))
  }
  async init() {
    await this.client.init()
  }
  async list(e, t) {
    let i = await this.client.resolveFileId(t),
      n = (await this.client.listFiles(i)).map(bc)
    return G(n, this.addition.order_by, this.addition.order_direction)
  }
  async get(e, t) {
    let i = await this.client.resolveFileId(t),
      s = await this.client.getFile(i).catch(() => null)
    if (s) {
      let a = bc(s)
      return (
        (a.raw_url = this.client.getDownloadUrl(i)),
        (a.raw_url_headers = this.client.getDownloadHeaders()),
        a
      )
    }
    let n = t.split("/").filter(Boolean),
      o = n[n.length - 1] || "root"
    try {
      return (
        await this.client.listFiles(i),
        {
          name: o,
          size: 0,
          is_dir: !0,
          modified: new Date().toISOString(),
          sign: "",
          type: 1,
          raw_url: "",
        }
      )
    } catch {}
    return {
      name: o,
      size: 0,
      is_dir: !1,
      modified: new Date().toISOString(),
      sign: "",
      type: 0,
      raw_url: "",
    }
  }
  async mkdir(e, t) {
    let { parentId: i, name: s } = await this.client.resolveParentAndName(t)
    await this.client.mkdir(i, s)
  }
  async rename(e, t, i) {
    let s = await this.client.resolveFileId(t)
    await this.client.rename(s, i)
  }
  async remove(e, t, i) {
    let s = await this.client.resolveFileId(t)
    await this.client.remove(s)
  }
  async move(e, t, i, s, n) {
    let o = await this.client.resolveFileId(s),
      a = s.split("/").filter(Boolean)
    a.pop()
    let c = await this.client.resolveFileId("/" + a.join("/")),
      d = await this.client.resolveFileId(t)
    await this.client.move(o, c, d)
  }
  async copy(e, t, i, s, n) {
    let o = await this.client.resolveFileId(s),
      a = s.split("/").filter(Boolean).pop() || "copy",
      c = await this.client.resolveFileId(t)
    await this.client.copy(o, c, a)
  }
  async put(e, t, i) {
    let { parentId: s, name: n } = await this.client.resolveParentAndName(t)
    await this.client.putFile(s, n, i)
  }
}
fe()
var Nf = {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) quark-cloud-drive/2.5.20 Chrome/100.0.4896.160 Electron/18.3.5.4-b478491100 Safari/537.36 Channel/pckk_other_ch",
    referer: "https://pan.quark.cn",
    api: "https://drive-m.quark.cn/1/clouddrive",
    pr: "ucpro",
  },
  Mf = {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) uc-cloud-drive/2.5.20 Chrome/100.0.4896.160 Electron/18.3.5.4-b478491100 Safari/537.36 Channel/pckk_other_ch",
    referer: "https://drive.uc.cn",
    api: "https://pc-api.uc.cn/1/clouddrive",
    pr: "UCBrowser",
  }
function Hf(r = "Quark") {
  return r === "UC" ? Mf : Nf
}
function kc(r, e, t) {
  let i = r
      .split(";")
      .map((o) => o.trim())
      .filter(Boolean),
    s = i.findIndex((o) => {
      let a = o.indexOf("=")
      return a !== -1 && o.substring(0, a).trim() === e
    }),
    n = `${e}=${t}`
  return (s !== -1 ? (i[s] = n) : i.push(n), i.join("; "))
}
var bi = class {
  addition
  conf
  cookie
  onCookieUpdate
  constructor(e, t) {
    ;((this.addition = e),
      (this.conf = Hf(e.variant || "Quark")),
      (this.cookie = e.cookie || ""),
      (this.onCookieUpdate = t))
  }
  getRootFolderId() {
    return (this.addition.root_folder_id || "").trim() || "0"
  }
  getVariant() {
    return this.addition.variant || "Quark"
  }
  getConf() {
    return this.conf
  }
  getCookie() {
    return this.cookie
  }
  async request(e, t, i, s) {
    let n = new URL(this.conf.api + e)
    if (
      (n.searchParams.set("pr", this.conf.pr),
      n.searchParams.set("fr", "pc"),
      i)
    )
      for (let [u, f] of Object.entries(i)) n.searchParams.set(u, f)
    let o = {
        Cookie: this.cookie,
        Accept: "application/json, text/plain, */*",
        Referer: this.conf.referer,
        "Content-Type": "application/json",
        "User-Agent": this.conf.ua,
      },
      a = { method: t, headers: o }
    s !== void 0 && t !== "GET" && (a.body = JSON.stringify(s))
    let c = await fetch(n.toString(), a),
      d = c.headers.get("set-cookie")
    if (d) {
      let u = Sc(d, "__puus")
      if (
        (u &&
          ((this.cookie = kc(this.cookie, "__puus", u)),
          this.onCookieUpdate?.(this.cookie)),
        this.addition.variant === "Quark")
      ) {
        let f = Sc(d, "__pus")
        f &&
          ((this.cookie = kc(this.cookie, "__pus", f)),
          this.onCookieUpdate?.(this.cookie))
      }
    }
    let l = await c.json()
    if (
      !c.ok ||
      (l.status !== void 0 && l.status >= 400) ||
      (l.code !== void 0 && l.code !== 0)
    ) {
      let u = l.message || l.msg || `HTTP ${c.status}`
      throw new Error(`[Quark/UC] API error [${c.status}] ${e}: ${u}`)
    }
    return l
  }
  async getFiles(e) {
    let t = [],
      i = 1,
      s = 100,
      n = {
        pdir_fid: e,
        _size: String(s),
        _fetch_total: "1",
        fetch_all_file: "1",
        fetch_risk_file_name: "1",
      }
    if (this.addition.order_by && this.addition.order_by !== "none") {
      let o = this.addition.order_direction || "asc"
      n._sort = `file_type:asc,${this.addition.order_by}:${o}`
    }
    for (;;) {
      n._page = String(i)
      let o = await this.request("/file/sort", "GET", n),
        a = o?.data?.list || []
      if (a.length === 0) break
      for (let d of a)
        ((d.file_name = Kf(d.file_name)),
          this.addition.only_list_video_file
            ? (!d.file || d.category === 1) && t.push(d)
            : t.push(d))
      let c = o.metadata?.total ?? 0
      if ((c > 0 && i * s >= c) || a.length < s) break
      i++
    }
    return t
  }
  async getDownloadUrl(e, t) {
    let s = (
      await this.request("/file/download", "POST", void 0, { fids: [e] })
    ).data?.[0]
    if (!s?.download_url)
      throw new Error(`[Quark/UC] No download_url for file: ${t}`)
    return {
      url: s.download_url,
      headers: {
        Cookie: this.cookie,
        Referer: this.conf.referer,
        "User-Agent": this.conf.ua,
      },
    }
  }
  async mkdir(e, t) {
    return (
      (
        await this.request("/file", "POST", void 0, {
          dir_init_lock: !1,
          dir_path: "",
          file_name: t,
          pdir_fid: e,
        })
      ).data?.[0]?.fid || ""
    )
  }
  async rename(e, t) {
    await this.request("/file/rename", "POST", void 0, { fid: e, file_name: t })
  }
  async remove(e) {
    await this.request("/file/delete", "POST", void 0, {
      action_type: 2,
      filelist: e,
      exclude_fids: [],
    })
  }
  async move(e, t) {
    await this.request("/file/move", "POST", void 0, {
      filelist: e,
      to_pdir_fid: t,
    })
  }
  async copy(e, t) {
    await this.request("/file/copy", "POST", void 0, {
      filelist: e,
      to_pdir_fid: t,
    })
  }
  async uploadPreHash(e, t, i, s) {
    return (
      await this.request("/file/uploadpre", "POST", void 0, {
        ccp_hash_update: !0,
        dir_name: "",
        file_name: t,
        pdir_fid: e,
        size: i,
        pre_hash: s,
        format_type: Wf(t),
      })
    ).data
  }
  async uploadCommit(e, t, i) {
    return (
      await this.request("/file/upload/commit", "POST", void 0, {
        task_id: e,
        md5: t,
        obj_key: i,
      })
    ).data
  }
  async init() {
    if (!this.cookie?.trim()) {
      console.warn("[Quark/UC] Cookie is empty, skipping init.")
      return
    }
    try {
      ;(await this.request("/config", "GET"),
        console.log(`[Quark/UC] (${this.addition.variant || "Quark"}) init OK`))
    } catch (e) {
      console.warn("[Quark/UC] init warning:", e.message)
    }
  }
}
function Sc(r, e) {
  let t = r.split(/,(?=[^;]+=[^;]+)/)
  for (let i of t) {
    let n = i.split(";")[0].trim(),
      o = n.indexOf("=")
    if (o !== -1 && n.substring(0, o).trim() === e)
      return n.substring(o + 1).trim()
  }
  return null
}
function Kf(r) {
  return r
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}
function Wf(r) {
  let e = r.split(".").pop()?.toLowerCase() || "",
    t = [
      "mp4",
      "mkv",
      "avi",
      "mov",
      "flv",
      "wmv",
      "ts",
      "m2ts",
      "m4v",
      "rmvb",
      "webm",
    ],
    i = ["mp3", "flac", "aac", "wav", "ogg", "m4a", "opus"],
    s = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "heic", "tiff"],
    n = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md"]
  return t.includes(e)
    ? "video"
    : i.includes(e)
      ? "audio"
      : s.includes(e)
        ? "image"
        : n.includes(e)
          ? "doc"
          : "others"
}
function Pc(r) {
  let e = !r.file,
    t = r.updated_at
      ? new Date(r.updated_at).toISOString()
      : new Date().toISOString()
  return {
    name: r.file_name,
    size: r.size || 0,
    is_dir: e,
    modified: t,
    sign: "",
    type: L(r.file_name, e),
    thumb: r.thumbnail || "",
    raw_url: "",
  }
}
var ki = class {
  client
  pathFileIdCache = new Map()
  constructor(e) {
    this.client = new bi(e)
  }
  async init() {
    await this.client.init()
  }
  async list(e, t) {
    let i = await this.resolveFileId(t)
    return (await this.client.getFiles(i)).map(Pc)
  }
  async get(e, t) {
    let i = t.split("/").filter(Boolean),
      s = await this.resolveFileId(t),
      n = i[i.length - 1] || "root",
      o = (() => {
        try {
          return decodeURIComponent(n)
        } catch {
          return n
        }
      })(),
      a = "/" + i.slice(0, i.length - 1).join("/"),
      c = await this.resolveFileId(a),
      l = (await this.client.getFiles(c)).find(
        (p) => p.fid === s || p.file_name === n || p.file_name === o,
      ),
      u = "",
      f
    try {
      let p = await this.client.getDownloadUrl(s, o)
      ;((u = p.url), (f = p.headers))
    } catch (p) {
      console.warn(`[Quark/UC] getDownloadUrl warning for ${n}:`, p.message)
    }
    if (l) {
      let p = Pc(l)
      return ((p.raw_url = u), (p.raw_url_headers = f), p)
    }
    try {
      return (
        await this.client.getFiles(s),
        {
          name: o || "root",
          size: 0,
          is_dir: !0,
          modified: new Date().toISOString(),
          sign: "",
          type: 1,
          raw_url: "",
        }
      )
    } catch {}
    return {
      name: o || "root",
      size: 0,
      is_dir: !1,
      modified: new Date().toISOString(),
      sign: "",
      type: 0,
      raw_url: u,
      raw_url_headers: f,
    }
  }
  async mkdir(e, t) {
    let i = t.split("/").filter(Boolean),
      s = i.pop() || "\u65B0\u6587\u4EF6\u5939",
      n = "/" + i.join("/"),
      o = await this.resolveFileId(n)
    await this.client.mkdir(o, s)
  }
  async rename(e, t, i) {
    let s = await this.resolveFileId(t)
    await this.client.rename(s, i)
  }
  async remove(e, t, i) {
    let s = await this.resolveFileId(t)
    await this.client.remove([s])
  }
  async move(e, t, i, s, n) {
    let o = await this.resolveFileId(s),
      a = await this.resolveFileId(t)
    await this.client.move([o], a)
  }
  async copy(e, t, i, s, n) {
    let o = await this.resolveFileId(s),
      a = await this.resolveFileId(t)
    await this.client.copy([o], a)
  }
  async put(e, t, i) {
    throw new Error(
      "[Quark/UC] Direct put not supported in stateless environment",
    )
  }
  async resolveFileId(e) {
    let t = e.split("/").filter(Boolean).join("/")
    if (!t) return this.client.getRootFolderId()
    if (this.pathFileIdCache.has(t)) return this.pathFileIdCache.get(t)
    let i = t.split("/"),
      s = this.client.getRootFolderId()
    for (let n = 0; n < i.length; n++) {
      let o = i[n],
        a = (() => {
          try {
            return decodeURIComponent(o)
          } catch {
            return o
          }
        })(),
        d = (await this.client.getFiles(s)).find(
          (u) => u.file_name === o || u.file_name === a || u.fid === o,
        )
      if (!d)
        throw new Error(`[Quark/UC] Path '${o}' not found in folder '${s}'`)
      s = d.fid
      let l = "/" + i.slice(0, n + 1).join("/")
      this.pathFileIdCache.set(l, s)
    }
    return s
  }
}
fe()
var Oe = "https://yun.123pan.com/b/api",
  Gf = "https://login.123pan.com/api",
  Vf = Gf + "/user/sign_in"
function Jf(r) {
  let e = (r || "").trim()
  if (!e) return ""
  if (/^Bearer\s+/i.test(e)) return e.replace(/^Bearer\s+/i, "").trim()
  if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(e)) return e
  let t = {}
  for (let s of e.split(";")) {
    let n = s.indexOf("=")
    if (n < 0) continue
    let o = s.slice(0, n).trim(),
      a = s.slice(n + 1).trim()
    o && (t[o] = a)
  }
  let i = (s) => {
    let n = t[s] || ""
    return /^Bearer\s+/i.test(n) ? n.replace(/^Bearer\s+/i, "").trim() : n
  }
  return i("sso-token") || i("token") || i("authorization") || ""
}
var Qf = Oe + "/user/info",
  Xf = Oe + "/file/list/new",
  Yf = Oe + "/file/download_info",
  Zf = Oe + "/file/upload_request",
  ep = Oe + "/file/mod_pid",
  tp = Oe + "/file/rename",
  rp = Oe + "/file/trash",
  ip = Oe + "/file/upload_request",
  sp = Oe + "/file/s3_upload_object/auth",
  np = Oe + "/file/s3_repare_upload_parts_batch",
  op = Oe + "/file/upload_complete/v2",
  ap = (() => {
    let r = new Array(256)
    for (let e = 0; e < 256; e++) {
      let t = e
      for (let i = 0; i < 8; i++) t = t & 1 ? 3988292384 ^ (t >>> 1) : t >>> 1
      r[e] = t
    }
    return r
  })()
function Ac(r) {
  let e = 4294967295
  for (let t = 0; t < r.length; t++)
    e = ap[(e ^ r.charCodeAt(t)) & 255] ^ (e >>> 8)
  return (e ^ 4294967295) >>> 0
}
var cp = [
  "a",
  "d",
  "e",
  "f",
  "g",
  "h",
  "l",
  "m",
  "y",
  "i",
  "j",
  "n",
  "o",
  "p",
  "k",
  "q",
  "r",
  "s",
  "t",
  "u",
  "b",
  "c",
  "v",
  "w",
  "s",
  "z",
]
function dp(r) {
  let e = Math.round(1e7 * Math.random()).toString(),
    t = new Date(),
    s = Math.round((t.getTime() + 8 * 36e5) / 1e3).toString(),
    n = t.getUTCFullYear(),
    o = String(t.getUTCMonth() + 1).padStart(2, "0"),
    a = String(t.getUTCDate()).padStart(2, "0"),
    c = String(t.getUTCHours() + 8).padStart(2, "0"),
    d = String(t.getUTCMinutes()).padStart(2, "0"),
    u = `${n}${o}${a}${c}${d}`
      .split("")
      .map((m) => cp[parseInt(m)])
      .join(""),
    f = (Ac(u) >>> 0).toString(),
    p = [s, e, r, "web", "3", f].join("|"),
    h = (Ac(p) >>> 0).toString()
  return `${f}=${s}-${e}-${h}`
}
function lp(r) {
  let e = r.indexOf("?"),
    t = e >= 0 ? r.substring(0, e) : r,
    i = e >= 0 ? r.substring(e + 1) : "",
    s = new URL(r),
    n = dp(s.pathname)
  return `${t}?${i}${i ? "&" : ""}${n}`
}
var Si = class {
  addition
  accessToken = ""
  onTokenUpdate
  constructor(e, t) {
    ;((this.addition = e), (this.onTokenUpdate = t))
  }
  getRootId() {
    return (this.addition.root_id || "0").trim() || "0"
  }
  async login() {
    if (this.addition.access_token) {
      this.accessToken = this.addition.access_token
      try {
        await this.userInfo(!0)
        return
      } catch {
        this.accessToken = ""
      }
    }
    if (this.addition.cookie) {
      let e = Jf(this.addition.cookie)
      if (e) {
        this.accessToken = e
        try {
          ;(await this.userInfo(!0),
            (this.addition.access_token = e),
            this.onTokenUpdate?.(e))
          return
        } catch {
          this.accessToken = ""
        }
      }
    }
    if (!this.addition.username || !this.addition.password)
      throw new Error(
        "123 \u7F51\u76D8\u767B\u5F55\u51ED\u8BC1\u7F3A\u5931\uFF1A\u8BF7\u586B\u5199 123 \u7F51\u76D8\u624B\u673A\u53F7 + \u5BC6\u7801\uFF1B\u82E5\u90E8\u7F72\u73AF\u5883\uFF08\u5982 Cloudflare Workers \u6570\u636E\u4E2D\u5FC3 IP\uFF09\u5BC6\u7801\u767B\u5F55\u4F1A\u88AB\u98CE\u63A7\uFF0C\u53EF\u5728\u300CCookie\u300D\u5B57\u6BB5\u7C98\u8D34\u6D4F\u89C8\u5668\u767B\u5F55\u540E\u7684 Cookie\uFF08\u542B sso-token\uFF09\uFF0C\u6216\u586B\u5199\u6709\u6548\u7684\u8BBF\u95EE\u4EE4\u724C access_token\uFF08\u5728\u672C\u673A\u6D4F\u89C8\u5668\u767B\u5F55 https://www.123pan.com/ \u540E\u4ECE\u5F00\u53D1\u8005\u5DE5\u5177\u83B7\u53D6\uFF09\u3002",
      )
    await this.signIn()
  }
  async signIn() {
    let t = /@/.test(this.addition.username)
        ? {
            mail: this.addition.username,
            password: this.addition.password,
            type: 2,
          }
        : {
            passport: this.addition.username,
            password: this.addition.password,
            remember: !0,
          },
      s = await (
        await fetch(Vf, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            origin: "https://yun.123pan.com",
            referer: "https://yun.123pan.com/",
            "user-agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) openlist-client",
            platform: "web",
            "app-version": "3",
          },
          body: JSON.stringify(t),
        })
      ).json()
    if (s.code !== 200)
      throw new Error(
        `123 \u7F51\u76D8\u767B\u5F55\u5931\u8D25\uFF08${s.message || `code ${s.code}`}\uFF09\u3002\u5F53\u524D\u90E8\u7F72\u73AF\u5883\u7684\u51FA\u53E3 IP \u88AB 123 \u5224\u5B9A\u4E3A\u5883\u5916/\u964C\u751F\u8BBE\u5907\uFF08\u5982 Cloudflare Workers \u6570\u636E\u4E2D\u5FC3 IP\uFF09\uFF0C\u8D26\u53F7\u5BC6\u7801\u767B\u5F55\u4F1A\u88AB\u98CE\u63A7\u62E6\u622A\u3002\u53EF\u9760\u65B9\u6848\uFF1A\u2460 \u5728\u672C\u673A\u6D4F\u89C8\u5668\u767B\u5F55 https://www.123pan.com/\uFF08\u767B\u5F55\u4E00\u6B21\u6216\u4FEE\u6539\u5BC6\u7801\u53EF\u89E3\u9664\u8D26\u53F7\u98CE\u9669\uFF09\uFF0C\u6253\u5F00\u5F00\u53D1\u8005\u5DE5\u5177 \u2192 Application/Network \u2192 \u590D\u5236\u8BF7\u6C42\u5934\u4E2D\u7684 Bearer \u4EE4\u724C\uFF0C\u586B\u5165\u5B58\u50A8\u8BBE\u7F6E\u7684 access_token \u5B57\u6BB5\uFF08\u4EE4\u724C\u6709\u6548\u671F\u5185 API \u8BF7\u6C42\u4E0D\u53D7 IP \u98CE\u63A7\u5F71\u54CD\uFF09\uFF1B\u2461 \u6216\u5C06\u8BE5\u7F51\u76D8\u90E8\u7F72\u5230\u5883\u5185\u670D\u52A1\u5668\uFF08Node \u5BB9\u5668\u6A21\u5F0F\uFF09\u540E\u4F7F\u7528\u8D26\u53F7\u5BC6\u7801\u3002`,
      )
    if (((this.accessToken = s.data?.token || ""), !this.accessToken))
      throw new Error("login returned empty token")
    ;((this.addition.access_token = this.accessToken),
      this.onTokenUpdate?.(this.accessToken))
  }
  async request(e, t, i, s, n = !1) {
    let o = async () => {
        let d = lp(e),
          l = {
            origin: "https://yun.123pan.com",
            referer: "https://yun.123pan.com/",
            authorization: this.accessToken ? `Bearer ${this.accessToken}` : "",
            "user-agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) openlist-client",
            platform: this.addition.platform || "web",
            "app-version": "3",
            Accept: "application/json",
          },
          u = { method: t, headers: l }
        return (
          i !== void 0 &&
            t !== "GET" &&
            ((l["Content-Type"] = "application/json"),
            (u.body = JSON.stringify(i))),
          (await fetch(d, u)).json()
        )
      },
      a = await o(),
      c = a?.code
    if (c !== 0 && c !== 200) {
      if (c === 401 && !n) {
        ;(await this.login(), (a = await o()))
        let d = a?.code
        if (d !== 0 && d !== 200)
          throw new Error(a?.message || `api error: code ${d}`)
        return a
      }
      throw new Error(a?.message || `api error: code ${c}`)
    }
    return a
  }
  async userInfo(e = !1) {
    return (await this.request(Qf, "GET", void 0, void 0, e)).data
  }
  async getFiles(e, t) {
    let i = [],
      s = 1,
      n = "0",
      o = t?.maxPages ?? 45
    for (;;) {
      if (t?.budget) {
        if (t.budget.used >= t.budget.limit) {
          console.warn(
            `[123Pan] \u5DF2\u8FBE Cloudflare subrequest \u9884\u7B97\u4E0A\u9650(${t.budget.limit} \u6B21)\uFF0C\u7ED3\u679C\u5DF2\u622A\u65AD\uFF08\u76EE\u5F55\u6587\u4EF6\u8FC7\u591A\u6216\u8DEF\u5F84\u8FC7\u6DF1\uFF09`,
          )
          break
        }
        t.budget.used++
      }
      if (s > o) {
        console.warn(
          `[123Pan] \u5206\u9875\u8D85\u8FC7 ${o} \u9875\uFF0C\u7ED3\u679C\u53EF\u80FD\u4E0D\u5B8C\u6574\uFF08\u76EE\u5F55\u6587\u4EF6\u8FC7\u591A\uFF09`,
        )
        break
      }
      let a = new URLSearchParams({
          driveId: "0",
          limit: "100",
          next: n,
          orderBy: this.addition.order_by || "file_id",
          orderDirection: this.addition.order_direction || "desc",
          parentFileId: e,
          trashed: "false",
          SearchData: "",
          Page: String(s),
          OnlyLookAbnormalFile: "0",
          event: "homeListFile",
          operateType: "4",
          inDirectSpace: "false",
        }),
        c = `${Xf}?${a.toString()}`,
        d = await this.request(c, "GET"),
        l = d.data?.InfoList || []
      if ((i.push(...l), t?.findName)) {
        let f = l.find(
          (p) =>
            p.FileName === t.findName &&
            (t.findIsDir === void 0 || (p.Type === 1) === t.findIsDir),
        )
        if (f) return [f]
      }
      let u = String(d.data?.Next ?? "-1")
      if (!d.data || l.length === 0 || u === "-1") break
      ;((n = u), s++)
    }
    return i
  }
  async getDownloadLink(e) {
    let t = {
        driveId: 0,
        etag: e.Etag,
        fileId: e.FileId,
        fileName: e.FileName,
        s3keyFlag: e.S3KeyFlag,
        size: e.Size,
        type: e.Type,
      },
      s = (await this.request(Yf, "POST", t)).data?.DownloadUrl || ""
    if (!s) throw new Error("no download url")
    try {
      let a = new URL(s).searchParams.get("params")
      if (a) {
        let c = atob(a)
        s = new URL(c).toString()
      }
    } catch {}
    let n = await fetch(s, {
      method: "GET",
      redirect: "manual",
      headers: { Referer: "https://yun.123pan.com/" },
    })
    return n.status === 302
      ? n.headers.get("location") || s
      : (n.status < 300 &&
          (await n.json().catch(() => ({}))).data?.redirect_url) ||
          s
  }
  async mkdir(e, t) {
    let i = await this.request(Zf, "POST", {
      driveId: 0,
      etag: "",
      fileName: t,
      parentFileId: parseInt(e, 10) || 0,
      size: 0,
      type: 1,
    })
    return i.data?.FileId != null ? String(i.data.FileId) : ""
  }
  async rename(e, t) {
    await this.request(tp, "POST", {
      driveId: 0,
      fileId: parseInt(e, 10),
      fileName: t,
    })
  }
  async move(e, t) {
    await this.request(ep, "POST", {
      fileIdList: e.map((i) => ({ FileId: parseInt(i, 10) })),
      parentFileId: parseInt(t, 10),
    })
  }
  async remove(e, t) {
    await this.request(rp, "POST", {
      driveId: 0,
      operation: !0,
      fileTrashInfoList: [t],
    })
  }
  async getPartUploadUrl(e, t, i) {
    let n = (
      i === 1
        ? await this.getS3Auth(e, t, t + 1)
        : await this.getS3PreSignedUrls(e, t, t + 1)
    ).presignedUrls[String(t)]
    if (!n)
      throw new Error(
        `[123Pan] \u672A\u8FD4\u56DE\u7B2C ${t} \u5206\u7247\u7684\u4E0A\u4F20 URL`,
      )
    return n
  }
  async completeUpload(e, t, i) {
    await this.completeS3(e, t, i)
  }
  async createUpload(e, t, i, s) {
    let n = {
      driveId: 0,
      duplicate: 2,
      etag: s,
      fileName: e,
      parentFileId: t,
      size: i,
      type: 0,
    }
    return (await this.request(ip, "POST", n)).data
  }
  async getS3Auth(e, t, i) {
    let s = {
      StorageNode: e.StorageNode,
      bucket: e.Bucket,
      key: e.Key,
      partNumberEnd: i,
      partNumberStart: t,
      uploadId: e.UploadId,
    }
    return (await this.request(sp, "POST", s)).data
  }
  async getS3PreSignedUrls(e, t, i) {
    let s = {
      bucket: e.Bucket,
      key: e.Key,
      partNumberEnd: i,
      partNumberStart: t,
      uploadId: e.UploadId,
      StorageNode: e.StorageNode,
    }
    return (await this.request(np, "POST", s)).data
  }
  async completeS3(e, t, i) {
    await this.request(op, "POST", {
      StorageNode: e.StorageNode,
      bucket: e.Bucket,
      fileId: e.FileId,
      fileSize: t,
      isMultipart: i,
      key: e.Key,
      uploadId: e.UploadId,
    })
  }
  async uploadFile(e, t, i) {
    let s = ""
    try {
      s = (await import("node:crypto"))
        .createHash("md5")
        .update(i)
        .digest("hex")
    } catch {
      s = ""
    }
    let n = await this.createUpload(t, e, i.length, s)
    if (n.Reuse || n.Key === "") return
    let o = 16 * 1024 * 1024,
      a = 1
    i.length > o && (a = Math.ceil(i.length / o))
    let c = i.length % o
    c === 0 && (c = o)
    let d
    a === 1
      ? (d = (await this.getS3Auth(n, 1, 2)).presignedUrls)
      : (d = (await this.getS3PreSignedUrls(n, 1, a + 1)).presignedUrls)
    for (let l = 1; l <= a; l++) {
      let u = (l - 1) * o,
        f = l === a ? c : o,
        p = d[String(l)]
      if (!p)
        throw new Error(
          `[123Pan] \u7F3A\u5C11\u7B2C ${l} \u5206\u7247\u7684\u4E0A\u4F20 URL`,
        )
      let h = i.subarray(u, u + f),
        m = await fetch(p, { method: "PUT", body: h })
      if (m.status !== 200) {
        let w = await m.text().catch(() => "")
        throw new Error(
          `[123Pan] \u4E0A\u4F20\u7B2C ${l}/${a} \u5206\u7247\u5931\u8D25\uFF1AHTTP ${m.status} ${w}`,
        )
      }
    }
    await this.completeS3(n, i.length, a > 1)
  }
}
function up(r) {
  return Buffer.from(JSON.stringify(r), "utf8").toString("base64")
}
function Cc(r) {
  let e = JSON.parse(Buffer.from(r, "base64").toString("utf8"))
  if (!e || !e.bucket || !e.key || !e.uploadId)
    throw new Error("[123Pan] invalid upload session")
  return e
}
function Ec(r) {
  return {
    AccessKeyId: "",
    SecretAccessKey: "",
    SessionToken: "",
    Bucket: r.bucket,
    Key: r.key,
    UploadId: r.uploadId,
    FileId: r.fileId,
    StorageNode: r.storageNode,
    EndPoint: "",
    Reuse: !1,
  }
}
function Dc(r) {
  let e = r.Type === 1
  return {
    name: r.FileName,
    size: r.Size || 0,
    is_dir: e,
    modified: r.UpdateAt
      ? new Date(r.UpdateAt).toISOString()
      : new Date().toISOString(),
    sign: String(r.FileId),
    type: L(r.FileName, e),
    thumb: "",
    raw_url: "",
  }
}
var Pi = class {
  client
  addition
  pathIdCache = new Map()
  budget = { used: 0, limit: 45 }
  constructor(e, t) {
    ;((this.addition = e), (this.client = new Si(e, t)))
  }
  async init() {
    await this.client.login()
  }
  async resolveFolderId(e) {
    let t = this.client.getRootId(),
      i =
        "/" +
        String(e || "")
          .split("/")
          .filter(Boolean)
          .join("/")
    if (i === "/" || i === `/${t}`) return t
    let s = i.split("/").filter(Boolean),
      n = 0,
      o = t,
      a = ""
    for (let c = 0; c < s.length; c++) {
      let d = "/" + s.slice(0, c + 1).join("/"),
        l = this.pathIdCache.get(d)
      if (l !== void 0) ((o = l), (n = c + 1), (a = d))
      else break
    }
    for (let c = n; c < s.length; c++) {
      let d = s[c],
        l = (() => {
          try {
            return decodeURIComponent(d)
          } catch {
            return d
          }
        })(),
        f = (
          await this.client.getFiles(o, {
            findName: l,
            findIsDir: !0,
            budget: this.budget,
          })
        ).find(
          (p) =>
            p.Type === 1 &&
            (p.FileName === d ||
              p.FileName === l ||
              String(p.FileId) === d ||
              String(p.FileId) === l),
        )
      if (!f) throw new Error(`folder not found: ${d}`)
      ;((o = String(f.FileId)),
        (a = "/" + s.slice(0, c + 1).join("/")),
        this.pathIdCache.set(a, o))
    }
    return o
  }
  async ensureFolderId(e) {
    let t = this.client.getRootId(),
      i =
        "/" +
        String(e || "")
          .split("/")
          .filter(Boolean)
          .join("/")
    if (i === "/" || i === `/${t}`) return t
    let s = i.split("/").filter(Boolean),
      n = t,
      o = ""
    for (let a = 0; a < s.length; a++) {
      let c = s[a],
        d = (() => {
          try {
            return decodeURIComponent(c)
          } catch {
            return c
          }
        })()
      o = "/" + s.slice(0, a + 1).join("/")
      let l = this.pathIdCache.get(o)
      if (l === void 0) {
        let u = await this.client.getFiles(n, {
            findName: d,
            findIsDir: !0,
            budget: this.budget,
          }),
          f = u.find(
            (p) => p.Type === 1 && (p.FileName === c || p.FileName === d),
          )
        if (f) l = String(f.FileId)
        else {
          try {
            let p = await this.client.mkdir(n, d)
            p && (l = p)
          } catch {}
          if (l === void 0) {
            if (
              ((u = await this.client.getFiles(n, {
                findName: d,
                findIsDir: !0,
                budget: this.budget,
              })),
              (f = u.find((p) => p.Type === 1 && p.FileName === d)),
              !f)
            )
              throw new Error(
                `[123Pan] \u81EA\u52A8\u521B\u5EFA\u76EE\u5F55\u5931\u8D25: ${c}`,
              )
            l = String(f.FileId)
          }
        }
        this.pathIdCache.set(o, l)
      }
      n = l
    }
    return n
  }
  async resolveFile(e) {
    let t = String(e || "")
      .split("/")
      .filter(Boolean)
    if (t.length === 0) throw new Error("invalid path")
    let i = t[t.length - 1],
      s = (() => {
        try {
          return decodeURIComponent(i)
        } catch {
          return i
        }
      })(),
      n = "/" + t.slice(0, t.length - 1).join("/"),
      o = await this.resolveFolderId(n),
      c = (
        await this.client.getFiles(o, { findName: s, budget: this.budget })
      ).find(
        (d) =>
          String(d.FileId) === i ||
          String(d.FileId) === s ||
          d.FileName === i ||
          d.FileName === s,
      )
    if (!c) throw new Error(`file not found: ${i}`)
    return { file: c, parentId: o, name: i }
  }
  async list(e, t) {
    this.budget.used = 0
    let i = await this.resolveFolderId(t),
      n = (await this.client.getFiles(i, { budget: this.budget })).map(Dc)
    return G(
      n,
      this.addition.order_by || "file_name",
      this.addition.order_direction,
    )
  }
  async get(e, t) {
    this.budget.used = 0
    let i = String(t || "")
      .split("/")
      .filter(Boolean)
    if (i.length === 0 || i[i.length - 1] === this.client.getRootId()) {
      let o = this.client.getRootId()
      return {
        name: o,
        size: 0,
        is_dir: !0,
        modified: new Date().toISOString(),
        sign: o,
        type: 1,
        raw_url: "",
      }
    }
    let { file: s } = await this.resolveFile(t),
      n = Dc(s)
    if (s.Type !== 1)
      try {
        ;((n.raw_url = await this.client.getDownloadLink(s)),
          n.raw_url ||
            (n.raw_url_error =
              "123 \u7F51\u76D8\u672A\u8FD4\u56DE\u4E0B\u8F7D\u94FE\u63A5\uFF08DownloadUrl \u4E3A\u7A7A\uFF09\u3002\u5E38\u89C1\u539F\u56E0\uFF1Aaccess_token/cookie \u5931\u6548\uFF0C\u6216\u8BE5\u6587\u4EF6\u5DF2\u5220\u9664/\u88AB\u9650\u5236\u4E0B\u8F7D\u3002\u8BF7\u5230\u7BA1\u7406\u540E\u53F0\u66F4\u65B0 access_token \u540E\u91CD\u8BD5\u3002"))
      } catch (o) {
        ;((n.raw_url_error =
          `123 \u7F51\u76D8\u83B7\u53D6\u4E0B\u8F7D\u94FE\u63A5\u5931\u8D25\uFF1A${o?.message || String(o)}\u3002` +
          (String(o?.message || "").includes("\u767B\u5F55\u5931\u8D25")
            ? "\u5F53\u524D\u90E8\u7F72\u51FA\u53E3 IP \u53EF\u80FD\u88AB 123 \u98CE\u63A7\uFF0C\u8BF7\u914D\u7F6E\u6709\u6548\u7684 access_token\uFF08\u6D4F\u89C8\u5668\u767B\u5F55 123 \u7F51\u76D8\u540E\u590D\u5236 Bearer \u4EE4\u724C\uFF09\u3002"
            : "\u8BF7\u68C0\u67E5 access_token/cookie \u662F\u5426\u6709\u6548\uFF0C\u6216\u5728 123 \u7F51\u76D8\u7F51\u9875\u7AEF\u786E\u8BA4\u8BE5\u6587\u4EF6\u53EF\u4E0B\u8F7D\u3002")),
          console.warn(
            `[123Pan] getDownloadLink warning for ${s.FileName}:`,
            o.message,
          ))
      }
    else
      n.raw_url_error =
        "\u8BE5\u6761\u76EE\u662F\u6587\u4EF6\u5939\uFF0C\u4E0D\u53EF\u4F5C\u4E3A\u6587\u4EF6\u4E0B\u8F7D\u3002"
    return n
  }
  async mkdir(e, t) {
    this.budget.used = 0
    let i = String(t || "")
        .split("/")
        .filter(Boolean),
      s = i.pop() || "\u65B0\u6587\u4EF6\u5939",
      n = "/" + i.join("/"),
      o = await this.resolveFolderId(n)
    await this.client.mkdir(o, s)
  }
  async rename(e, t, i) {
    this.budget.used = 0
    let { file: s } = await this.resolveFile(t)
    await this.client.rename(String(s.FileId), i)
  }
  async remove(e, t, i) {
    this.budget.used = 0
    let { file: s } = await this.resolveFile(t)
    await this.client.remove(String(s.FileId), s)
  }
  async move(e, t, i, s, n) {
    this.budget.used = 0
    let { file: o } = await this.resolveFile(s),
      a = String(t).split("/").filter(Boolean),
      c = await this.resolveFolderId("/" + a.join("/"))
    await this.client.move([String(o.FileId)], c)
  }
  async copy() {
    throw new Error("[123Pan] Copy is not supported by 123 Cloud Drive API")
  }
  async put(e, t, i) {
    this.budget.used = 0
    let s = String(t || "")
      .split("/")
      .filter(Boolean)
    if (s.length === 0) throw new Error("invalid upload path")
    let n = s[s.length - 1],
      o = (() => {
        try {
          return decodeURIComponent(n)
        } catch {
          return n
        }
      })(),
      a = "/" + s.slice(0, s.length - 1).join("/"),
      c = await this.ensureFolderId(a)
    await this.client.uploadFile(c, o, i)
  }
  async createUploadSession(e, t, i, s, n) {
    this.budget.used = 0
    let o = await this.ensureFolderId(t || "/"),
      a = await this.client.createUpload(i, o, s, n || ""),
      c = 16 * 1024 * 1024
    if (a.Reuse || a.Key === "")
      return { reuse: !0, partCount: 0, chunkSize: c, session: "" }
    let d = Math.max(1, Math.ceil(s / c)),
      l = up({
        bucket: a.Bucket,
        key: a.Key,
        uploadId: a.UploadId,
        fileId: a.FileId,
        storageNode: a.StorageNode,
        size: s,
        partCount: d,
        chunkSize: c,
      })
    return { reuse: !1, partCount: d, chunkSize: c, session: l }
  }
  async uploadPart(e, t, i) {
    this.budget.used = 0
    let s = Cc(e),
      n = await this.client.getPartUploadUrl(Ec(s), t, s.partCount),
      o = await fetch(n, { method: "PUT", body: i })
    if (o.status !== 200) {
      let a = await o.text().catch(() => "")
      throw new Error(
        `[123Pan] \u4E0A\u4F20\u7B2C ${t}/${s.partCount} \u5206\u7247\u5931\u8D25\uFF1AHTTP ${o.status} ${a}`,
      )
    }
  }
  async completeUploadSession(e) {
    this.budget.used = 0
    let t = Cc(e)
    await this.client.completeUpload(Ec(t), t.size, t.partCount > 1)
  }
}
fe()
Sr()
var pp = "https://openapi.baidu.com/oauth/2.0/token",
  Tc = "https://pan.baidu.com/rest/2.0",
  Nt = 4 * 1024 * 1024,
  qn = 16 * 1024 * 1024,
  On = 32 * 1024 * 1024,
  $n = 2048,
  hp = 1 * 1024 * 1024,
  Mt = "https://d.pcs.baidu.com",
  gp = 60 * 1e3,
  Pr = 3,
  zn = 1e3,
  Bc = 5e3,
  mp = new Set([111, -6, 20016])
function yp(r) {
  return new Promise((e) => setTimeout(e, r))
}
function jn(r) {
  if (!r) return r
  try {
    let e = new URL(r)
    return (e.searchParams.delete("access_token"), e.toString())
  } catch {
    return r
  }
}
function Kt(r) {
  let e = { ...(r || {}) },
    t = (i, s) =>
      i == null || i === ""
        ? s
        : typeof i == "boolean"
          ? i
          : String(i).toLowerCase() === "true"
  return (
    (e.use_online_api = t(e.use_online_api, !0)),
    (e.api_url_address =
      e.api_url_address || "https://api.oplist.org/baiduyun/renewapi"),
    (e.download_api = e.download_api || "official"),
    (e.custom_crack_ua = e.custom_crack_ua || "netdisk"),
    (e.order_by = e.order_by || "name"),
    (e.order_direction = e.order_direction || "asc"),
    (e.upload_thread = e.upload_thread || "3"),
    (e.upload_api = e.upload_api || Mt),
    (e.use_dynamic_upload_api = t(e.use_dynamic_upload_api, !0)),
    (e.custom_upload_part_size = e.custom_upload_part_size || 0),
    (e.low_bandwith_upload_mode = t(e.low_bandwith_upload_mode, !1)),
    (e.only_list_video_file = t(e.only_list_video_file, !1)),
    e
  )
}
var Ei = class r {
    addition
    accessToken = ""
    onTokenUpdate
    constructor(e, t) {
      ;((this.addition = Kt(e)),
        (this.onTokenUpdate = t),
        this.addition.access_token &&
          (this.accessToken = this.addition.access_token))
    }
    static apiUA =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/142.0.0.0 OpenList/425.6.30"
    async refreshToken() {
      let e = this.addition
      if (e.use_online_api && e.api_url_address) {
        let n = new URL(e.api_url_address)
        ;(n.searchParams.set("refresh_ui", e.refresh_token),
          n.searchParams.set("server_use", "true"),
          n.searchParams.set("driver_txt", "baiduyun_go"))
        let o = await fetch(n.toString(), {
            headers: { "User-Agent": r.apiUA },
          }),
          a,
          c = await o.text()
        try {
          a = JSON.parse(c)
        } catch {
          throw new Error(
            `\u5728\u7EBF API \u5237\u65B0\u5931\u8D25 (HTTP ${o.status})\uFF1A${c.slice(0, 300) || "\u975E JSON \u54CD\u5E94"}\u3002\u8BF7\u786E\u8BA4 refresh_token \u662F\u901A\u8FC7 https://api.oplist.org/ \u83B7\u53D6\u7684\u6709\u6548\u4EE4\u724C\u3002`,
          )
        }
        if (!a.refresh_token || !a.access_token)
          throw new Error(
            a.text ||
              (o.status !== 200
                ? `\u5728\u7EBF API \u8FD4\u56DE HTTP ${o.status}`
                : "empty token returned from official API, a wrong refresh token may have been used"),
          )
        ;((this.accessToken = a.access_token),
          (e.refresh_token = a.refresh_token),
          (e.access_token = a.access_token),
          this.onTokenUpdate?.({
            access_token: a.access_token,
            refresh_token: a.refresh_token,
          }))
        return
      }
      if (!e.client_id || !e.client_secret)
        throw new Error("empty ClientID or ClientSecret")
      let t = new URL(pp)
      ;(t.searchParams.set("grant_type", "refresh_token"),
        t.searchParams.set("refresh_token", e.refresh_token),
        t.searchParams.set("client_id", e.client_id),
        t.searchParams.set("client_secret", e.client_secret))
      let s = await (await fetch(t.toString())).json()
      if (s.error) throw new Error(`${s.error}: ${s.error_description || ""}`)
      if (!s.refresh_token)
        throw new Error("empty refresh token returned from OAuth")
      ;((this.accessToken = s.access_token || ""),
        (e.refresh_token = s.refresh_token),
        (e.access_token = s.access_token || ""),
        this.onTokenUpdate?.({
          access_token: s.access_token || "",
          refresh_token: s.refresh_token,
        }))
    }
    async login() {
      this.accessToken || (await this.refreshToken())
    }
    async ensureToken() {
      this.accessToken || (await this.refreshToken())
    }
    async request(e, t, i, s) {
      await this.ensureToken()
      let n = async () => {
          let a = new URL(e)
          a.searchParams.set("access_token", this.accessToken)
          for (let [h, m] of Object.entries(i || {})) a.searchParams.set(h, m)
          let c = { "User-Agent": r.apiUA, Accept: "application/json" },
            d = { method: t, headers: c }
          if (s && t === "POST") {
            let h = new URLSearchParams()
            for (let [m, w] of Object.entries(s)) h.set(m, w)
            ;((c["Content-Type"] = "application/x-www-form-urlencoded"),
              (d.body = h.toString()))
          }
          let l = await fetch(a.toString(), d),
            u = await l.text(),
            f
          try {
            f = JSON.parse(u)
          } catch {
            throw new Error(
              `req: [${e}] invalid JSON response, status ${l.status}`,
            )
          }
          let p = typeof f.errno == "number" ? f.errno : 0
          if (p !== 0) {
            if (
              (mp.has(p) && (await this.refreshToken()),
              p === 31023 && this.addition.download_api === "crack_video")
            )
              return f
            let h = `req: [${e}] ,errno: ${p}, refer to https://pan.baidu.com/union/doc/`
            throw p === 31023
              ? new Error(
                  `${h} \u767E\u5EA6\u7F51\u76D8\u98CE\u63A7 (Trigger security policy: Please try again later) \u2014 \u89E6\u53D1\u539F\u56E0\u901A\u5E38\u662F\uFF1A\u2460 \u5F53\u524D\u90E8\u7F72\u73AF\u5883\u7684\u51FA\u53E3 IP\uFF08\u5982 Cloudflare Workers \u6570\u636E\u4E2D\u5FC3 IP\uFF09\u88AB\u767E\u5EA6\u5B89\u5168\u7B56\u7565\u62E6\u622A\uFF1B\u2461 refresh_token \u65E0\u6548\u6216\u4ECE\u975E\u5B98\u65B9\u6E20\u9053\u83B7\u53D6\uFF0C\u5BFC\u81F4\u8D26\u53F7\u88AB\u98CE\u63A7\u3002\u8BF7\u786E\u8BA4\uFF1Arefresh_token \u5FC5\u987B\u901A\u8FC7 https://api.oplist.org/ \u83B7\u53D6\uFF08\u672C\u9A71\u52A8\u9ED8\u8BA4\u5DF2\u5F00\u542F"\u4F7F\u7528\u5728\u7EBF API"\uFF09\uFF1B\u98CE\u63A7\u4E3A\u4E34\u65F6\u6027\uFF0C\u7B49\u5F85\u6570\u5206\u949F\u81F3\u6570\u5C0F\u65F6\u540E\u81EA\u52A8\u89E3\u9664\uFF1B\u957F\u671F\u4F7F\u7528\u8BF7\u5C06\u540E\u7AEF\u90E8\u7F72\u5230\u5883\u5185\u670D\u52A1\u5668\uFF08\u6216\u914D\u7F6E HTTPS_PROXY \u5883\u5185\u4EE3\u7406\uFF09\u3002`,
                )
              : new Error(h)
          }
          return f
        },
        o
      for (let a = 0; a < Pr; a++)
        try {
          return await n()
        } catch (c) {
          ;((o = c), a < Pr - 1 && (await yp(zn * Math.pow(2, a))))
        }
      throw o
    }
    get(e, t) {
      return this.request(Tc + e, "GET", t)
    }
    postForm(e, t, i) {
      return this.request(Tc + e, "POST", t, i)
    }
    async uinfo() {
      let e = await this.get("/xpan/nas", { method: "uinfo" })
      return typeof e.vip_type == "number" ? e.vip_type : 0
    }
    async getFiles(e) {
      let s = { method: "list", dir: e, web: "web" }
      this.addition.order_by &&
        ((s.order = this.addition.order_by),
        this.addition.order_direction === "desc" && (s.desc = "1"))
      let n = []
      for (let o = 0; ; o += 1e3) {
        ;((s.start = String(o)), (s.limit = String(1e3)))
        let c = (await this.get("/xpan/file", s)).list || []
        if (c.length === 0) break
        if (this.addition.only_list_video_file)
          for (let d of c) (d.isdir === 1 || d.category === 1) && n.push(d)
        else n.push(...c)
        if (c.length < 1e3) break
      }
      return n
    }
    async getOfficialLink(e) {
      let i = (
        await this.get("/xpan/multimedia", {
          method: "filemetas",
          fsids: `[${e}]`,
          dlink: "1",
        })
      ).list?.[0]?.dlink
      if (!i) throw new Error("no dlink returned from filemetas")
      let s = `${i}&access_token=${this.accessToken}`,
        o =
          (
            await fetch(s, {
              method: "HEAD",
              redirect: "manual",
              headers: { "User-Agent": "pan.baidu.com" },
            })
          ).headers.get("location") || s
      return { url: jn(o), headers: { "User-Agent": "pan.baidu.com" } }
    }
    async getCrackLink(e) {
      let i = (
        await this.request("https://pan.baidu.com/api/filemetas", "GET", {
          target: `["${e}"]`,
          dlink: "1",
          web: "5",
          origin: "dlna",
        })
      ).info?.[0]?.dlink
      if (!i) throw new Error("no dlink returned from crack filemetas")
      return {
        url: jn(i),
        headers: { "User-Agent": this.addition.custom_crack_ua || "netdisk" },
      }
    }
    async getCrackVideoLink(e, t) {
      let s = (
        await this.request("https://pan.baidu.com/api/mediainfo", "GET", {
          type: "VideoURL",
          path: e,
          fs_id: String(t),
          devuid: "0%1",
          clienttype: "1",
          channel: "android_15_25010PN30C_bd-netdisk_1523a",
          nom3u8: "1",
          dlink: "1",
          media: "1",
          origin: "dlna",
        })
      )?.info?.dlink
      if (!s) throw new Error("no dlink returned from mediainfo")
      return {
        url: jn(s),
        headers: { "User-Agent": this.addition.custom_crack_ua || "netdisk" },
      }
    }
    async manage(e, t) {
      return this.postForm(
        "/xpan/file",
        { method: "filemanager", opera: e },
        { async: "0", filelist: JSON.stringify(t), ondup: "fail" },
      )
    }
    async create(e, t, i, s, n, o, a) {
      let c = { path: e, size: String(t), isdir: String(i), rtype: "3" }
      return (
        o !== 0 && a !== 0 && Ic(c, a, o),
        s && (c.uploadid = s),
        n && (c.block_list = n),
        this.postForm("/xpan/file", { method: "create" }, c)
      )
    }
    async precreate(e, t, i, s, n, o, a) {
      let c = {
        path: e,
        size: String(t),
        isdir: "0",
        autoinit: "1",
        rtype: "3",
        block_list: i,
      }
      ;(s !== "" && n !== "" && ((c["content-md5"] = s), (c["slice-md5"] = n)),
        Ic(c, o, a))
      let d = await this.postForm("/xpan/file", { method: "precreate" }, c)
      return (
        d.return_type === 2 &&
          d.info &&
          ((d.info.ctime = o), (d.info.mtime = a)),
        d
      )
    }
    async uploadSlice(e, t, i, s, n) {
      let o = new URL(e + "/rest/2.0/pcs/superfile2")
      for (let [l, u] of Object.entries(t)) o.searchParams.set(l, u)
      let a = new FormData()
      a.append("file", new Blob([s]), i)
      let c = new AbortController(),
        d = setTimeout(() => c.abort(), n > 0 ? n : gp)
      try {
        let u = await (
            await fetch(o.toString(), {
              method: "POST",
              body: a,
              signal: c.signal,
            })
          ).text(),
          f = u.toLowerCase()
        if (
          f.includes("uploadid") &&
          (f.includes("invalid") ||
            f.includes("expired") ||
            f.includes("not found"))
        )
          throw new Ht()
        let p
        try {
          p = JSON.parse(u)
        } catch {
          p = {}
        }
        let h = p?.error_code ?? 0,
          m = p?.errno ?? 0
        if (h !== 0 || m !== 0)
          throw new Error(`error uploading to baidu, response=${u}`)
      } finally {
        clearTimeout(d)
      }
    }
    getUploadUrl(e, t) {
      let i = this.addition
      return (!i.use_dynamic_upload_api || !t, i.upload_api || Mt)
    }
    async requestForUploadUrl(e, t) {
      let i = await this.request(
          "https://d.pcs.baidu.com/rest/2.0/pcs/file",
          "GET",
          {
            method: "locateupload",
            appid: "250528",
            path: e,
            uploadid: t,
            upload_version: "2.0",
          },
        ),
        s = ""
      if (
        (i.servers && i.servers.length > 0
          ? (s = i.servers[0].server)
          : i.bak_servers &&
            i.bak_servers.length > 0 &&
            (s = i.bak_servers[0].server),
        !s)
      )
        throw new Error("upload URL is empty")
      return s
    }
    getSliceSize(e, t) {
      let i = this.addition,
        s = i.custom_upload_part_size || 0
      if (t === 0)
        return (
          s !== 0 &&
            console.warn(
              "[baidu_netdisk] CustomUploadPartSize is not supported for non-vip user, use DefaultSliceSize",
            ),
          e > $n * Nt &&
            console.warn(
              `[baidu_netdisk] File size(${e}) is too large, may cause upload failure`,
            ),
          Nt
        )
      if (s !== 0)
        return s < Nt
          ? (console.warn(
              `[baidu_netdisk] CustomUploadPartSize(${s}) is less than DefaultSliceSize, use DefaultSliceSize`,
            ),
            Nt)
          : t === 1 && s > qn
            ? (console.warn(
                `[baidu_netdisk] CustomUploadPartSize(${s}) is greater than VipSliceSize, use VipSliceSize`,
              ),
              qn)
            : t === 2 && s > On
              ? (console.warn(
                  `[baidu_netdisk] CustomUploadPartSize(${s}) is greater than SVipSliceSize, use SVipSliceSize`,
                ),
                On)
              : s
      let n = Nt
      if (
        (t === 1 && (n = qn), t === 2 && (n = On), i.low_bandwith_upload_mode)
      ) {
        let o = Nt
        for (; o <= n; ) {
          if (e <= $n * o) return o
          o += hp
        }
      }
      return (
        e > $n * n &&
          console.warn(
            `[baidu_netdisk] File size(${e}) is too large, may cause upload failure`,
          ),
        n
      )
    }
    async quota() {
      let e = await this.request("https://pan.baidu.com/api/quota", "GET")
      return { total: e.total || 0, used: e.used || 0 }
    }
  },
  Ht = class extends Error {
    constructor() {
      ;(super("uploadid expired"), (this.name = "ErrUploadIDExpired"))
    }
  }
function Ic(r, e, t) {
  ;((r.local_mtime = String(t)), (r.local_ctime = String(e)))
}
var wp = new Error("empty files are not allowed by baidu netdisk")
function xp(r) {
  return new Promise((e) => setTimeout(e, r))
}
function Rc(r) {
  let e = r.server_filename || Ar(r.path),
    t = r.server_ctime || r.ctime || 0,
    i = r.server_mtime || r.mtime || 0,
    s = r.isdir === 1
  return {
    name: e,
    size: r.size || 0,
    is_dir: s,
    created: t ? new Date(t * 1e3).toISOString() : void 0,
    modified: i ? new Date(i * 1e3).toISOString() : new Date().toISOString(),
    sign: String(r.fs_id),
    type: L(e, s),
    thumb: r.thumbs?.url3 || "",
    raw_url: "",
  }
}
function Ar(r) {
  let e = String(r || "").split("/")
  return e[e.length - 1] || ""
}
var Di = class {
  client
  addition
  uploadThread = 3
  vipType = 0
  pathCache = new Map()
  constructor(e, t) {
    ;((this.addition = Kt(e)), (this.client = new Ei(this.addition, t)))
  }
  async init() {
    let e = this.addition,
      t = parseInt(e.upload_thread || "3", 10)
    if (
      (t < 1 && (t = 1),
      t > 32 && (t = 32),
      (this.uploadThread = t),
      !this.client.accessToken)
    )
      throw new Error(
        "\u767E\u5EA6\u7F51\u76D8\u7F3A\u5C11\u8BBF\u95EE\u4EE4\u724C access_token\uFF08\u5FC5\u586B\uFF09\uFF1A\u8BF7\u901A\u8FC7 https://api.oplist.org/ \u83B7\u53D6\u540E\u586B\u5199\u3002",
      )
    this.vipType = await this.client.uinfo()
  }
  baiduPath(e) {
    let t = "/" + String(e || "").replace(/\/+/g, "/")
    return t === "/" ? "/" : t.replace(/\/$/, "")
  }
  async list(e, t) {
    let i = await this.client.getFiles(this.baiduPath(t)),
      s = i.map(Rc)
    for (let n of i)
      this.pathCache.set(n.path, { fsId: n.fs_id, parent: Uc(n.path) })
    return G(s, this.addition.order_by || "name", this.addition.order_direction)
  }
  async get(e, t) {
    let i = this.baiduPath(t)
    if (i === "/")
      return {
        name: "/",
        size: 0,
        is_dir: !0,
        modified: new Date().toISOString(),
        sign: "",
        type: 1,
        raw_url: "",
      }
    let s = Uc(i),
      n = Ar(i),
      o = (() => {
        try {
          return decodeURIComponent(n)
        } catch {
          return n
        }
      })(),
      c = (await this.client.getFiles(s)).find(
        (l) =>
          l.server_filename === n ||
          l.server_filename === o ||
          l.path === i ||
          String(l.fs_id) === n,
      )
    if (!c) throw new Error(`file not found: ${n}`)
    this.pathCache.set(c.path, { fsId: c.fs_id, parent: s })
    let d = Rc(c)
    if (c.isdir !== 1)
      try {
        let l = await this.getDownloadLink(c)
        ;((d.raw_url = l.url), (d.raw_url_headers = l.headers))
      } catch (l) {
        console.warn(
          `[baidu_netdisk] getDownloadLink warning for ${c.server_filename}:`,
          l.message,
        )
      }
    return d
  }
  async getDownloadLink(e) {
    let t = this.addition.download_api || "official"
    return t === "crack"
      ? this.client.getCrackLink(e.path)
      : t === "crack_video"
        ? this.client.getCrackVideoLink(e.path, e.fs_id)
        : this.client.getOfficialLink(e.fs_id)
  }
  async mkdir(e, t) {
    await this.client.create(this.baiduPath(t), 0, 1, "", "", 0, 0)
  }
  async rename(e, t, i) {
    await this.client.manage("rename", [
      { path: this.baiduPath(t), newname: i },
    ])
  }
  async remove(e, t, i) {
    await this.client.manage("delete", [this.baiduPath(t)])
  }
  async move(e, t, i, s, n) {
    let o = i[0] || Ar(s),
      a = this.baiduPath(t)
    await this.client.manage("move", [
      { path: this.baiduPath(s), dest: a, newname: o },
    ])
  }
  async copy(e, t, i, s, n) {
    let o = i[0] || Ar(s),
      a = this.baiduPath(t)
    await this.client.manage("copy", [
      { path: this.baiduPath(s), dest: a, newname: o },
    ])
  }
  async put(e, t, i) {
    if (i.length < 1) throw wp
    let s = i.length,
      n = this.baiduPath(t),
      o = Ar(n),
      a = Math.floor(Date.now() / 1e3),
      c = a,
      d = a,
      l = Ai(i),
      u = JSON.stringify([l])
    try {
      await this.client.create(n, s, 0, "", u, c, d)
      return
    } catch {}
    let f = this.client.getSliceSize(s, this.vipType),
      p = Math.max(1, Math.ceil(s / f)),
      h = s % f || f,
      m = []
    for (let y = 0; y < p; y++) {
      let v = y === p - 1 ? h : f,
        x = i.subarray(y * f, y * f + v)
      m.push(Ai(x))
    }
    let w = JSON.stringify(m),
      g = await this.client.precreate(
        n,
        s,
        w,
        l,
        Ai(i.subarray(0, 256 * 1024)),
        d,
        c,
      )
    if (!(g.return_type === 2 && g.info)) {
      for (let y = 0; y < 2; y++) {
        let v = this.addition.upload_api || Mt
        if (this.addition.use_dynamic_upload_api && g.uploadid)
          try {
            v = await this.client.requestForUploadUrl(n, g.uploadid)
          } catch {
            v = this.addition.upload_api || Mt
          }
        let x = g.block_list || [],
          _ = !1,
          b = 0,
          S = Math.max(1, Math.min(this.uploadThread, x.length)),
          A = async () => {
            for (;;) {
              let C = b++
              if (C >= x.length) return
              let P = x[C]
              if (P < 0) continue
              let k = P * f,
                D = P + 1 === p ? h : f,
                T = i.subarray(k, k + D),
                E = {
                  method: "upload",
                  access_token: this.client.accessToken,
                  type: "tmpfile",
                  path: n,
                  uploadid: g.uploadid,
                  partseq: String(P),
                },
                O = !1
              for (let q = 0; q < Pr; q++)
                try {
                  ;(await this.client.uploadSlice(
                    v,
                    E,
                    o,
                    T,
                    (this.addition.upload_timeout || 60) * 1e3,
                  ),
                    (x[C] = -1),
                    (O = !0))
                  break
                } catch (j) {
                  if (j instanceof Ht) throw j
                  q < Pr - 1 && (await xp(Math.min(zn * Math.pow(2, q), Bc)))
                }
              if (!O) throw ((_ = !0), new Error(`upload slice ${P} failed`))
            }
          }
        try {
          if ((await Promise.all(Array.from({ length: S }, () => A())), _))
            throw new Error("upload slice failed")
        } catch (C) {
          if (C instanceof Ht) {
            let P = await this.client.precreate(n, s, w, "", "", d, c)
            if (P.return_type === 2 && P.info) return
            g = P
            continue
          }
          throw C
        }
        await this.client.create(n, s, 0, g.uploadid, w, c, d)
        return
      }
      throw new Error("upload failed after retries")
    }
  }
}
function Uc(r) {
  let e = r.lastIndexOf("/")
  return e <= 0 ? "/" : r.slice(0, e)
}
fe()
Sr()
var $e = "https://proapi.115.com",
  _p = "https://passportapi.115.com",
  vp = $e + "/open/upload/get_token",
  bp = $e + "/open/upload/init",
  kp = $e + "/open/folder/add",
  Sp = $e + "/open/ufile/files",
  qc = $e + "/open/folder/get_info",
  Pp = $e + "/open/ufile/copy",
  Ap = $e + "/open/ufile/move",
  Cp = $e + "/open/ufile/downurl",
  Ep = $e + "/open/ufile/update",
  Dp = $e + "/open/ufile/delete",
  Fp = $e + "/open/user/info",
  Tp = _p + "/open/refreshToken"
function Ip(r) {
  return r === 99 || String(r).startsWith("401")
}
var Cr = 430004,
  Fi = class r {
    addition
    accessToken = ""
    refreshTokenValue = ""
    onTokenUpdate
    rateLimitMs = 0
    lastRequestAt = 0
    constructor(e, t) {
      ;((this.addition = e),
        (this.accessToken = e.access_token || ""),
        (this.refreshTokenValue = e.refresh_token || ""),
        (this.onTokenUpdate = t))
      let i = e.limit_rate || 0
      i > 0 && (this.rateLimitMs = 1e3 / i)
    }
    async waitRateLimit() {
      if (this.rateLimitMs <= 0) return
      let e = Date.now(),
        t = this.lastRequestAt + this.rateLimitMs - e
      ;(t > 0 && (await new Promise((i) => setTimeout(i, t))),
        (this.lastRequestAt = Date.now()))
    }
    async fetchWithRetry(e, t) {
      let i
      for (let s = 0; s < 3; s++)
        try {
          let n = new AbortController(),
            o = setTimeout(() => n.abort(), 2e4)
          try {
            return await fetch(e, { ...t, signal: n.signal })
          } finally {
            clearTimeout(o)
          }
        } catch (n) {
          ;((i = n),
            s < 2 && (await new Promise((o) => setTimeout(o, 500 * (s + 1)))))
        }
      throw i
    }
    static describeNetError(e) {
      let t = e,
        i = t?.cause?.code || t?.cause?.cause?.code,
        s = t?.cause?.message || t?.cause?.cause?.message
      return i
        ? `${t?.message || "fetch failed"}\uFF08${i}\uFF09`
        : s
          ? `${t?.message || "fetch failed"}\uFF08${s}\uFF09`
          : t?.message || String(e)
    }
    async refreshToken() {
      if (!this.refreshTokenValue)
        throw new Error(
          "115 \u7F51\u76D8\u7F3A\u5C11 refresh_token\uFF08\u5FC5\u586B\uFF09",
        )
      let e = new URLSearchParams()
      e.set("refresh_token", this.refreshTokenValue)
      let i = await (
        await this.fetchWithRetry(Tp, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: e.toString(),
        })
      ).json()
      if (i.code !== 0 || !i.data?.access_token || !i.data?.refresh_token)
        throw new Error(
          `115 \u7F51\u76D8 token \u5237\u65B0\u5931\u8D25\uFF08code ${i.code} ${i.message}\uFF09\uFF1A\u8BF7\u786E\u8BA4 refresh_token \u6709\u6548\u3002`,
        )
      ;((this.accessToken = i.data.access_token),
        (this.refreshTokenValue = i.data.refresh_token),
        (this.addition.access_token = this.accessToken),
        (this.addition.refresh_token = this.refreshTokenValue),
        this.onTokenUpdate?.({
          access_token: this.accessToken,
          refresh_token: this.refreshTokenValue,
        }))
    }
    async request(e, t, i, s, n, o = !1) {
      await this.waitRateLimit()
      let a = async () => {
          let l = new URL(e)
          for (let [w, g] of Object.entries(i || {}))
            g !== "" && l.searchParams.set(w, g)
          let u = {
            Accept: "application/json",
            "User-Agent":
              n ||
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/142.0.0.0 OpenList/425.6.30",
          }
          this.accessToken && (u.Authorization = `Bearer ${this.accessToken}`)
          let f = { method: t, headers: u }
          if (s && t === "POST") {
            let w = new URLSearchParams()
            for (let [g, y] of Object.entries(s)) y !== "" && w.set(g, y)
            ;((u["Content-Type"] = "application/x-www-form-urlencoded"),
              (f.body = w.toString()))
          }
          let p = await this.fetchWithRetry(l.toString(), f),
            h = await p.text(),
            m
          try {
            m = JSON.parse(h)
          } catch {
            m = { state: !1, code: p.status, message: h.slice(0, 200) }
          }
          return { body: m, rawText: h }
        },
        c
      try {
        ;({ body: c } = await a())
      } catch (l) {
        throw new Error(r.describeNetError(l))
      }
      let d = c?.state
      if (d === !1 || d === void 0) {
        let l = Number(c?.code ?? 0)
        if (Ip(l) && !o) {
          ;(await this.refreshToken(), (c = (await a()).body))
          let f = c?.state
          if (f !== !1 && f !== void 0) return c
          throw new Error(
            `115 \u7F51\u76D8 API \u9519\u8BEF\uFF08code ${c?.code} ${c?.message}\uFF09`,
          )
        }
        if (l === Cr) {
          let u = new Error("115 object not found")
          throw ((u.code = Cr), u)
        }
        throw new Error(
          `115 \u7F51\u76D8 API \u9519\u8BEF\uFF08code ${l} ${c?.message || ""}\uFF09`,
        )
      }
      return c
    }
    async userInfo() {
      return (await this.request(Fp, "GET"))?.data
    }
    async getFiles(e) {
      let t = await this.request(Sp, "GET", {
        cid: e.cid,
        limit: String(e.limit),
        offset: String(e.offset),
        asc: e.asc ? "1" : "0",
        o: e.o || "",
        show_dir: e.showDir ? "1" : "0",
        cur: "1",
      })
      return { files: t.data || [], count: t.count || 0 }
    }
    async getFolderInfo(e) {
      return (await this.request(qc, "GET", { file_id: e }))?.data
    }
    async getFolderInfoByPath(e) {
      return (await this.request(qc, "POST", void 0, { path: e }))?.data
    }
    async mkdir(e, t) {
      return (await this.request(kp, "POST", void 0, { pid: e, file_name: t }))
        ?.data
    }
    async move(e, t) {
      await this.request(Ap, "POST", void 0, { file_ids: e, to_cid: t })
    }
    async updateFile(e, t) {
      await this.request(Ep, "POST", void 0, { file_id: e, file_name: t })
    }
    async copy(e, t) {
      await this.request(Pp, "POST", void 0, {
        pid: e,
        file_id: t,
        no_dupli: "1",
      })
    }
    async delFile(e, t) {
      await this.request(Dp, "POST", void 0, { file_ids: e, parent_id: t })
    }
    async downUrl(e, t) {
      return (await this.request(Cp, "POST", void 0, { pick_code: e }, t))?.data
    }
    async uploadGetToken() {
      return (await this.request(vp, "GET"))?.data
    }
    async uploadInit(e) {
      return (
        await this.request(bp, "POST", void 0, {
          file_name: e.fileName,
          file_size: String(e.fileSize),
          target: `U_1_${e.target}`,
          fileid: e.fileId,
          preid: e.preId,
          sign_key: e.signKey || "",
          sign_val: e.signVal || "",
        })
      )?.data
    }
  }
var Ti =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/142.0.0.0 OpenList/425.6.30",
  Bp = 45
function Oc(r) {
  let e = r.fc === "0"
  return {
    name: r.fn,
    size: r.fs || 0,
    is_dir: e,
    created: r.uppt ? new Date(r.uppt * 1e3).toISOString() : void 0,
    modified: r.upt
      ? new Date(r.upt * 1e3).toISOString()
      : new Date().toISOString(),
    sign: r.fid,
    type: L(r.fn, e),
    thumb: r.thumbnail || r.fco || "",
    raw_url: "",
  }
}
function Rp(r) {
  let e = { ...(r || {}) }
  return (
    (e.order_by = e.order_by || "file_name"),
    (e.order_direction = e.order_direction || "asc"),
    (e.page_size = e.page_size || 200),
    (e.root_folder_id || e.root_folder_id === "0") &&
      !e.root_id &&
      (e.root_id = String(e.root_folder_id)),
    e
  )
}
var Ii = class r {
  client
  addition
  pageSize = 200
  parentPath = "/"
  fidCache = new Map()
  budget = { used: 0, limit: Bp }
  linkCache = new Map()
  static LINK_TTL_MS = 1800 * 1e3
  constructor(e, t) {
    ;((this.addition = Rp(e)), (this.client = new Fi(this.addition, t)))
  }
  async init() {
    let t = this.addition.page_size || 200
    ;(t <= 0 && (t = 200), t > 1150 && (t = 1150), (this.pageSize = t))
    try {
      await this.client.userInfo()
    } catch (s) {
      if (s?.code === Cr) throw s
      let n = String(s?.message || s)
      throw n.includes("fetch") || n.includes("ECONN") || n.includes("abort")
        ? new Error(
            `115 \u7F51\u76D8\u7F51\u7EDC\u8FDE\u63A5\u5931\u8D25\uFF08${n}\uFF09\uFF1Aproapi.115.com \u53EF\u80FD\u65E0\u6CD5\u4ECE\u5F53\u524D\u90E8\u7F72\u73AF\u5883\u8BBF\u95EE\uFF08\u6570\u636E\u4E2D\u5FC3 IP \u53EF\u80FD\u88AB 115 \u62E6\u622A\uFF09\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u6216\u66F4\u6362\u90E8\u7F72\u73AF\u5883\u3002`,
          )
        : new Error(
            `115 \u7F51\u76D8 token \u9A8C\u8BC1\u5931\u8D25\uFF1A${n}\u3002\u8BF7\u786E\u8BA4 access_token / refresh_token \u6709\u6548\u3002`,
          )
    }
    let i = this.getRootId()
    if (i !== "0")
      try {
        let s = await this.client.getFolderInfo(i)
        if (s.file_id !== "0") {
          this.parentPath = `/${s.file_name}`
          let n = [...(s.paths || [])].reverse()
          for (let o of n) this.parentPath = `/${o.file_name}${this.parentPath}`
        }
      } catch (s) {
        console.warn("[115open] init root path resolve failed:", s.message)
      }
  }
  getRootId() {
    return (this.addition.root_id || "0").trim() || "0"
  }
  reserve() {
    return this.budget.used >= this.budget.limit
      ? (console.warn(
          `[115open] \u5DF2\u8FBE Cloudflare subrequest \u9884\u7B97\u4E0A\u9650(${this.budget.limit})\uFF0C\u7ED3\u679C\u5DF2\u622A\u65AD`,
        ),
        !1)
      : (this.budget.used++, !0)
  }
  async list(e, t) {
    this.budget.used = 0
    let i = await this.resolveFolderId(t),
      s = [],
      n = 0
    for (; this.reserve(); ) {
      let { files: o, count: a } = await this.client.getFiles({
        cid: i,
        limit: this.pageSize,
        offset: n,
        asc: this.addition.order_direction === "asc",
        o: this.addition.order_by || "file_name",
        showDir: !0,
      })
      for (let c of o) (s.push(Oc(c)), this.fidCache.set(c.fid, c.fid))
      if (s.length >= a || o.length === 0) break
      n += o.length
    }
    return G(
      s,
      this.addition.order_by || "file_name",
      this.addition.order_direction,
    )
  }
  async resolveFolderId(e) {
    let t = this.getRootId(),
      i =
        "/" +
        String(e || "")
          .split("/")
          .filter(Boolean)
          .join("/")
    if (i === "/" || i === `/${t}`) return t
    let s = this.fidCache.get(i)
    if (s) return s
    let n = `/${t === "0" ? "" : t}${i === "/" ? "" : i}`
    try {
      if (!this.reserve()) throw new Error("subrequest budget exceeded")
      let d = await this.client.getFolderInfoByPath(n)
      if (d.file_id) return (this.fidCache.set(i, d.file_id), d.file_id)
    } catch (d) {
      if (d?.code !== Cr && d?.code !== 990002) throw d
    }
    let o = i.split("/").filter(Boolean),
      a = t,
      c = ""
    for (let d of o) {
      let l = (() => {
        try {
          return decodeURIComponent(d)
        } catch {
          return d
        }
      })()
      c = `${c}/${d}`
      let u = this.fidCache.get(c)
      if (u) {
        a = u
        continue
      }
      if (!this.reserve()) throw new Error("subrequest budget exceeded")
      let { files: f } = await this.client.getFiles({
          cid: a,
          limit: 1e3,
          offset: 0,
          asc: !0,
          o: "file_name",
          showDir: !0,
        }),
        p = f.find(
          (h) => h.fc === "0" && (h.fn === d || h.fn === l || h.fid === d),
        )
      if (!p) throw new Error(`folder not found: ${d}`)
      ;((a = p.fid), this.fidCache.set(c, a))
    }
    return a
  }
  async resolveFile(e) {
    let t =
        "/" +
        String(e || "")
          .split("/")
          .filter(Boolean)
          .join("/"),
      i = t.split("/").filter(Boolean),
      s = i.pop() || ""
    if (!s) throw new Error(`file not found: ${t}`)
    let n = (() => {
        try {
          return decodeURIComponent(s)
        } catch {
          return s
        }
      })(),
      o = "/" + i.join("/"),
      a = await this.resolveFolderId(o),
      c = 0
    for (;;) {
      if (!this.reserve()) throw new Error("subrequest budget exceeded")
      let { files: d, count: l } = await this.client.getFiles({
          cid: a,
          limit: Math.max(this.pageSize, 1e3),
          offset: c,
          asc: !0,
          o: "file_name",
          showDir: !0,
        }),
        u = d.find(
          (f) => f.fn === s || f.fn === n || f.fid === s || f.fid === n,
        )
      if (u) return u
      if (d.length === 0 || c + d.length >= l) break
      c += d.length
    }
    throw new Error(`file not found: ${s}`)
  }
  async get(e, t) {
    this.budget.used = 0
    let i =
      "/" +
      String(t || "")
        .split("/")
        .filter(Boolean)
        .join("/")
    if (i === "/" || i === `/${this.getRootId()}`)
      return {
        name: this.getRootId(),
        size: 0,
        is_dir: !0,
        modified: new Date().toISOString(),
        sign: this.getRootId(),
        type: 1,
        raw_url: "",
      }
    let s = await this.resolveFile(t),
      n = Oc(s)
    if (s.fc !== "0" && s.pc)
      try {
        let o = `${s.fid}|${Ti}`,
          a = this.linkCache.get(o)
        if (a && a.expire > Date.now())
          ((n.raw_url = a.url), (n.raw_url_headers = { "User-Agent": Ti }))
        else {
          if (!this.reserve()) throw new Error("subrequest budget exceeded")
          let d = (await this.client.downUrl(s.pc, Ti))[s.fid]
          d?.url?.url &&
            ((n.raw_url = d.url.url),
            (n.raw_url_headers = { "User-Agent": Ti }),
            this.linkCache.set(o, {
              url: d.url.url,
              expire: Date.now() + r.LINK_TTL_MS,
            }))
        }
      } catch (o) {
        String(o?.message || o).includes("406")
          ? console.warn(
              "[115open] downurl \u914D\u989D\u7528\u5C3D\uFF08406\uFF09\uFF1A\u5DF2\u4F7F\u7528\u7F13\u5B58\u6216\u7A0D\u540E\u91CD\u8BD5",
            )
          : console.warn(`[115open] downUrl warning for ${s.fn}:`, o.message)
      }
    return n
  }
  async mkdir(e, t) {
    this.budget.used = 0
    let i = String(t || "")
        .split("/")
        .filter(Boolean),
      s = i.pop() || "\u65B0\u6587\u4EF6\u5939",
      n = "/" + i.join("/"),
      o = await this.resolveFolderId(n)
    if (!this.reserve()) throw new Error("subrequest budget exceeded")
    await this.client.mkdir(o, s)
  }
  async rename(e, t, i) {
    this.budget.used = 0
    let s = await this.resolveFile(t)
    if (!this.reserve()) throw new Error("subrequest budget exceeded")
    await this.client.updateFile(s.fid, i)
  }
  async remove(e, t, i) {
    this.budget.used = 0
    let s = await this.resolveFile(t)
    if (!this.reserve()) throw new Error("subrequest budget exceeded")
    await this.client.delFile(s.fid, s.pid || this.getRootId())
  }
  async move(e, t, i, s, n) {
    this.budget.used = 0
    let o = await this.resolveFile(s),
      a = await this.resolveFolderId(t)
    if (!this.reserve()) throw new Error("subrequest budget exceeded")
    await this.client.move(o.fid, a)
  }
  async copy(e, t, i, s, n) {
    this.budget.used = 0
    let o = await this.resolveFile(s),
      a = await this.resolveFolderId(t)
    if (!this.reserve()) throw new Error("subrequest budget exceeded")
    await this.client.copy(a, o.fid)
  }
  async put(e, t, i) {
    if (i.length < 1)
      throw new Error(
        "115 \u7F51\u76D8\u4E0D\u5141\u8BB8\u4E0A\u4F20\u7A7A\u6587\u4EF6",
      )
    this.budget.used = 0
    let s = String(t || "")
        .split("/")
        .filter(Boolean),
      n = s.pop() || "file",
      o = "/" + s.join("/"),
      c = await this.resolveFolderId(o),
      d = i.length,
      l = (await Ci(i)).toUpperCase(),
      u = Math.min(128 * 1024, d),
      f = (await Ci(i.subarray(0, u))).toUpperCase()
    if (!this.reserve()) throw new Error("subrequest budget exceeded")
    let p = await this.client.uploadInit({
      fileName: n,
      fileSize: d,
      target: c,
      fileId: l,
      preId: f,
    })
    if (p.status === 2) return
    if ([6, 7, 8].includes(p.status) && p.sign_check) {
      let m = p.sign_check.split("-"),
        w = parseInt(m[0], 10),
        g = parseInt(m[1], 10)
      if (Number.isFinite(w) && Number.isFinite(g)) {
        let y = (await Ci(i.subarray(w, g + 1))).toUpperCase()
        if (!this.reserve()) throw new Error("subrequest budget exceeded")
        if (
          ((p = await this.client.uploadInit({
            fileName: n,
            fileSize: d,
            target: c,
            fileId: l,
            preId: f,
            signKey: p.sign_key,
            signVal: y,
          })),
          p.status === 2)
        )
          return
      }
    }
    if (!this.reserve()) throw new Error("subrequest budget exceeded")
    let h = await this.client.uploadGetToken()
    if (!p.bucket || !p.object || !h.endpoint)
      throw new Error(
        "115 \u4E0A\u4F20\u521D\u59CB\u5316\u5931\u8D25\uFF1A\u7F3A\u5C11 OSS \u4E0A\u4F20\u4FE1\u606F",
      )
    await this.ossPutObject(h, p, i)
  }
  async ossPutObject(e, t, i) {
    let n = `${(e.endpoint.startsWith("http") ? e.endpoint : `https://${e.endpoint}`).replace(/\/$/, "")}/${t.object}`,
      o = Buffer.from(t.callback?.callback || "", "utf8").toString("base64"),
      a = Buffer.from(t.callback?.callback_var || "", "utf8").toString(
        "base64",
      ),
      c = new Date().toUTCString(),
      d = "application/octet-stream",
      l = `x-oss-callback:${o}
x-oss-callback-var:${a}
x-oss-security-token:${e.SecurityToken}
`,
      u = `/${t.bucket}/${t.object}`,
      f = `PUT

${d}
${c}
${l}${u}`,
      p = await Fc(f, e.AccessKeySecret),
      h = await fetch(n, {
        method: "PUT",
        headers: {
          "Content-Type": d,
          Date: c,
          Authorization: `OSS ${e.AccessKeyId}:${p}`,
          "x-oss-security-token": e.SecurityToken,
          "x-oss-callback": o,
          "x-oss-callback-var": a,
          "Content-Length": String(i.length),
        },
        body: i,
      })
    if (!h.ok) {
      let m = (await h.text()).slice(0, 300)
      throw new Error(
        `115 OSS \u4E0A\u4F20\u5931\u8D25\uFF08HTTP ${h.status}\uFF09\uFF1A${m}`,
      )
    }
  }
}
fe()
function re(r) {
  if (!r) return "/"
  let t = r
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "")
  return t ? "/" + t : "/"
}
function We(r) {
  let e = re(r)
  if (e === "/") return "/"
  let t = e.split("/").filter(Boolean)
  return (t.pop(), t.length ? "/" + t.join("/") : "/")
}
function ge(r) {
  let e = re(r)
  if (e === "/") return ""
  let t = e.split("/").filter(Boolean)
  return t[t.length - 1] || ""
}
function Wt(...r) {
  return re(r.join("/"))
}
function kt(r, e, t) {
  if (!r || !r.trim()) return `${e.UserName} ${t} ${e.ObjPath}`
  let i = r
  return (
    (i = i.replace(/\{\{\.UserName\}\}/g, e.UserName || "")),
    (i = i.replace(/\{\{\.ObjName\}\}/g, e.ObjName || "")),
    (i = i.replace(/\{\{\.ObjPath\}\}/g, e.ObjPath || "")),
    (i = i.replace(/\{\{\.ParentName\}\}/g, e.ParentName || "")),
    (i = i.replace(/\{\{\.ParentPath\}\}/g, e.ParentPath || "")),
    (i = i.replace(/\{\{\.TargetName\}\}/g, e.TargetName || "")),
    (i = i.replace(/\{\{\.TargetPath\}\}/g, e.TargetPath || "")),
    i
  )
}
function $c(r, e) {
  let t = re(r),
    i = re(e),
    s = 1
  for (; s < t.length && s < i.length && t[s] === i[s]; ) s++
  let n = s
  for (; n < t.length && t[n] !== "/"; ) n++
  let o = s
  for (; o < i.length && i[o] !== "/"; ) o++
  for (; s > 0 && t[s] !== "/"; ) s--
  let a = re(t.slice(0, s)),
    c = t.slice(s + 1, n),
    d = i.slice(s + 1, o),
    l = t.slice(s + 1),
    u = i.slice(s + 1)
  return { ancestor: a, aChildName: c, bChildName: d, aRest: l, bRest: u }
}
var Bi = class {
  addition
  token
  owner
  repo
  constructor(e) {
    ;((this.addition = e),
      (this.token = (e.token || "").trim()),
      (this.owner = (e.owner || "").trim()),
      (this.repo = (e.repo || "").trim()))
  }
  get headers() {
    let e = {
      Accept: "application/vnd.github.object+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "OpenListNext-Github-Driver",
    }
    return (this.token && (e.Authorization = `Bearer ${this.token}`), e)
  }
  async request(e, t = {}) {
    let i = { ...this.headers, ...(t.headers || {}) },
      s
    t.body !== void 0 &&
      (typeof t.body == "string"
        ? (s = t.body)
        : ((s = JSON.stringify(t.body)),
          i["Content-Type"] || (i["Content-Type"] = "application/json")))
    let n = await fetch(e, { method: t.method || "GET", headers: i, body: s })
    if (!n.ok) {
      let o = `${n.status} ${n.statusText}`
      try {
        let a = await n.json()
        a?.message && (o = `${n.status} ${n.statusText}: ${a.message}`)
      } catch {}
      throw new Error(o)
    }
    return n.status === 204 ? {} : await n.json()
  }
  getContentApiUrl(e) {
    let t = re(e)
    return `https://api.github.com/repos/${this.owner}/${this.repo}/contents${t === "/" ? "" : t}`
  }
  async getContents(e, t) {
    let i = new URL(this.getContentApiUrl(e))
    return (t && i.searchParams.set("ref", t), this.request(i.toString()))
  }
  async getRepo() {
    return this.request(
      `https://api.github.com/repos/${this.owner}/${this.repo}`,
    )
  }
  async getBranchHead(e) {
    return (
      await this.request(
        `https://api.github.com/repos/${this.owner}/${this.repo}/branches/${encodeURIComponent(e)}`,
      )
    ).commit.sha
  }
  async getAuthenticatedUser() {
    return this.request("https://api.github.com/user")
  }
  async getTree(e) {
    return this.request(
      `https://api.github.com/repos/${this.owner}/${this.repo}/git/trees/${e}`,
    )
  }
  async getTreeDirectly(e, t) {
    let i = await this.getContents(e, t)
    if (!i.entries && i.type !== "dir") throw new Error(`${e} is not a folder`)
    let s = await this.getTree(i.sha)
    if (s.truncated) throw new Error(`tree ${e} is truncated`)
    return { tree: s, dirSha: i.sha }
  }
  async newTree(e, t) {
    let i = { tree: t }
    return (
      e && (i.base_tree = e),
      (
        await this.request(
          `https://api.github.com/repos/${this.owner}/${this.repo}/git/trees`,
          {
            method: "POST",
            body: i,
            headers: { Accept: "application/vnd.github+json" },
          },
        )
      ).sha
    )
  }
  async putBlob(e) {
    let t = Buffer.from(e).toString("base64")
    return (
      await this.request(
        `https://api.github.com/repos/${this.owner}/${this.repo}/git/blobs`,
        {
          method: "POST",
          body: { encoding: "base64", content: t },
          headers: { Accept: "application/vnd.github+json" },
        },
      )
    ).sha
  }
  async createCommit(e, t, i, s, n) {
    let o = { message: e, tree: t, parents: [i] }
    return (
      s?.name &&
        (o.committer = {
          name: s.name,
          email: s.email,
          date: new Date().toISOString(),
        }),
      n?.name &&
        (o.author = {
          name: n.name,
          email: n.email,
          date: new Date().toISOString(),
        }),
      (
        await this.request(
          `https://api.github.com/repos/${this.owner}/${this.repo}/git/commits`,
          {
            method: "POST",
            body: o,
            headers: { Accept: "application/vnd.github+json" },
          },
        )
      ).sha
    )
  }
  async updateRef(e, t) {
    await this.request(
      `https://api.github.com/repos/${this.owner}/${this.repo}/git/refs/heads/${encodeURIComponent(e)}`,
      {
        method: "PATCH",
        body: { sha: t, force: !1 },
        headers: { Accept: "application/vnd.github+json" },
      },
    )
  }
  async renewParentTrees(e, t, i, s, n) {
    let o = re(e),
      a = re(s)
    for (; o !== a; ) {
      o = We(o)
      let { tree: c, dirSha: d } = await this.getTreeDirectly(o, n),
        l = c.tree.find((f) => f.sha === t)
      if (!l) throw new Error(`Object with sha ${t} not found in ${o}`)
      let u = { path: l.path, mode: l.mode, type: l.type, sha: i }
      ;((i = await this.newTree(d, [u])), (t = d))
    }
    return i
  }
}
var Ri = class {
  addition
  client
  isOnBranch = !1
  commitLock = Promise.resolve()
  constructor(e) {
    ;((this.addition = e), (this.client = new Bi(e)))
  }
  async acquireLock(e) {
    let t = this.commitLock,
      i
    ;((this.commitLock = new Promise((s) => {
      i = s
    })),
      await t)
    try {
      return await e()
    } finally {
      i()
    }
  }
  formatDownloadUrl(e) {
    if (!e) return ""
    let t = (this.addition.gh_proxy || "").trim()
    return t ? e.replace("https://raw.githubusercontent.com", t) : e
  }
  async commitAndPush(e, t) {
    let i = this.addition.ref,
      s = await this.client.getBranchHead(i),
      n =
        this.addition.committer_name && this.addition.committer_email
          ? {
              name: this.addition.committer_name,
              email: this.addition.committer_email,
            }
          : void 0,
      o =
        this.addition.author_name && this.addition.author_email
          ? {
              name: this.addition.author_name,
              email: this.addition.author_email,
            }
          : void 0,
      a = await this.client.createCommit(e, t, s, n, o)
    await this.client.updateRef(i, a)
  }
  async init() {
    if (
      ((this.addition.root_folder_path = re(
        this.addition.root_folder_path || "/",
      )),
      (this.addition.committer_name && !this.addition.committer_email) ||
        (!this.addition.committer_name && this.addition.committer_email))
    )
      throw new Error(
        "committer_name and committer_email must both be set or empty",
      )
    if (
      (this.addition.author_name && !this.addition.author_email) ||
      (!this.addition.author_name && this.addition.author_email)
    )
      throw new Error("author_name and author_email must both be set or empty")
    if (!this.addition.ref || !this.addition.ref.trim()) {
      let e = await this.client.getRepo()
      ;((this.addition.ref = e.default_branch), (this.isOnBranch = !0))
    } else
      try {
        ;(await this.client.getBranchHead(this.addition.ref),
          (this.isOnBranch = !0))
      } catch {
        this.isOnBranch = !1
      }
  }
  async list(e, t) {
    let i = re(t),
      s = await this.client.getContents(i, this.addition.ref)
    if (!s.entries && s.type !== "dir") throw new Error(`${t} is not a folder`)
    let n = []
    if (s.entries && s.entries.length >= 1e3) {
      let o = await this.client.getTree(s.sha)
      if (o.truncated)
        throw new Error(`Tree ${t} is truncated (>100,000 items)`)
      for (let a of o.tree) {
        if (a.path === ".gitkeep") continue
        let c = a.type === "tree"
        n.push({
          name: a.path,
          size: a.size || 0,
          is_dir: c,
          modified: new Date(0).toISOString(),
          sign: "",
          type: L(a.path, c),
          raw_url: "",
        })
      }
    } else if (s.entries)
      for (let o of s.entries) {
        if (o.name === ".gitkeep") continue
        let a = o.type === "dir"
        n.push({
          name: o.name,
          size: o.size || 0,
          is_dir: a,
          modified: new Date(0).toISOString(),
          sign: "",
          type: L(o.name, a),
          raw_url: this.formatDownloadUrl(o.download_url),
        })
      }
    return G(n, this.addition.order_by, this.addition.order_direction)
  }
  async get(e, t) {
    let i = re(t),
      s = await this.client.getContents(i, this.addition.ref)
    if (s.type === "submodule") throw new Error("cannot download a submodule")
    let n = s.type === "dir" || !!s.entries,
      o = s.name || ge(i) || "root"
    return {
      name: o,
      size: s.size || 0,
      is_dir: n,
      modified: new Date(0).toISOString(),
      sign: "",
      type: L(o, n),
      raw_url: this.formatDownloadUrl(s.download_url),
    }
  }
  async mkdir(e, t) {
    if (!this.isOnBranch)
      throw new Error("cannot write to non-branch reference")
    let i = re(t),
      s = We(i),
      n = ge(i)
    await this.acquireLock(async () => {
      let o = await this.client.getContents(s, this.addition.ref)
      if (!o.entries && o.type !== "dir")
        throw new Error(`${s} is not a folder`)
      let a = await this.client.newTree("", [
          { path: ".gitkeep", mode: "100644", type: "blob", content: "" },
        ]),
        c = [{ path: n, mode: "040000", type: "tree", sha: a }]
      o.entries?.length === 1 &&
        o.entries[0].name === ".gitkeep" &&
        c.push({ path: ".gitkeep", mode: "100644", type: "blob", sha: null })
      let d = await this.client.newTree(o.sha, c),
        l = await this.client.renewParentTrees(
          s,
          o.sha,
          d,
          "/",
          this.addition.ref,
        ),
        u = kt(
          this.addition.mkdir_commit_message,
          {
            UserName: "OpenListNext",
            ObjName: n,
            ObjPath: i,
            ParentName: ge(s),
            ParentPath: s,
          },
          "mkdir",
        )
      await this.commitAndPush(u, l)
    })
  }
  async put(e, t, i) {
    if (!this.isOnBranch)
      throw new Error("cannot write to non-branch reference")
    let s = re(t),
      n = We(s),
      o = ge(s)
    await this.acquireLock(async () => {
      let a = await this.client.putBlob(i),
        c = await this.client.getContents(n, this.addition.ref)
      if (!c.entries && c.type !== "dir")
        throw new Error(`${n} is not a folder`)
      let d = [{ path: o, mode: "100644", type: "blob", sha: a }]
      c.entries?.length === 1 &&
        c.entries[0].name === ".gitkeep" &&
        d.push({ path: ".gitkeep", mode: "100644", type: "blob", sha: null })
      let l = await this.client.newTree(c.sha, d),
        u = await this.client.renewParentTrees(
          n,
          c.sha,
          l,
          "/",
          this.addition.ref,
        ),
        f = kt(
          this.addition.put_commit_message,
          {
            UserName: "OpenListNext",
            ObjName: o,
            ObjPath: s,
            ParentName: ge(n),
            ParentPath: n,
          },
          "upload",
        )
      await this.commitAndPush(f, u)
    })
  }
  async rename(e, t, i) {
    if (!this.isOnBranch)
      throw new Error("cannot write to non-branch reference")
    let s = re(t),
      n = We(s),
      o = ge(s)
    await this.acquireLock(async () => {
      let { tree: a, dirSha: c } = await this.client.getTreeDirectly(
          n,
          this.addition.ref,
        ),
        d = a.tree.find((m) => m.path === o)
      if (!d) throw new Error(`Object not found: ${s}`)
      if (d.type === "commit") throw new Error("cannot rename a submodule")
      let l = { path: o, mode: d.mode, type: d.type, sha: null },
        u = { path: i, mode: d.mode, type: d.type, sha: d.sha },
        f = await this.client.newTree(c, [l, u]),
        p = await this.client.renewParentTrees(n, c, f, "/", this.addition.ref),
        h = kt(
          this.addition.rename_commit_message,
          {
            UserName: "OpenListNext",
            ObjName: o,
            ObjPath: s,
            ParentName: ge(n),
            ParentPath: n,
            TargetName: i,
            TargetPath: Wt(n, i),
          },
          "rename",
        )
      await this.commitAndPush(h, p)
    })
  }
  async remove(e, t, i) {
    if (!this.isOnBranch)
      throw new Error("cannot write to non-branch reference")
    let s = re(t),
      n = We(s),
      o = ge(s)
    await this.acquireLock(async () => {
      let { tree: a, dirSha: c } = await this.client.getTreeDirectly(
          n,
          this.addition.ref,
        ),
        d = a.tree.find((h) => h.path === o)
      if (!d) throw new Error(`Object not found: ${s}`)
      if (d.type === "commit") throw new Error("cannot remove a submodule")
      let l = [{ path: o, mode: d.mode, type: d.type, sha: null }]
      a.tree.length === 1 &&
        l.push({ path: ".gitkeep", mode: "100644", type: "blob", content: "" })
      let u = await this.client.newTree(c, l),
        f = await this.client.renewParentTrees(n, c, u, "/", this.addition.ref),
        p = kt(
          this.addition.delete_commit_message,
          {
            UserName: "OpenListNext",
            ObjName: o,
            ObjPath: s,
            ParentName: ge(n),
            ParentPath: n,
          },
          "remove",
        )
      await this.commitAndPush(p, f)
    })
  }
  async move(e, t, i, s, n) {
    if (!this.isOnBranch)
      throw new Error("cannot write to non-branch reference")
    let o = re(s),
      a = re(t)
    if (a.startsWith(o)) throw new Error("cannot move parent dir to child")
    await this.acquireLock(async () => {
      let c = "",
        d = We(o),
        l = ge(o)
      if (a.startsWith(d)) {
        let {
            dstOldSha: f,
            dstNewSha: p,
            ancestorOldSha: h,
            srcParentTree: m,
          } = await this.copyWithoutRenewTree(o, a),
          g = a.slice(d.length).replace(/^\//, "").split("/")[0],
          y = Wt(d, g),
          v = await this.client.renewParentTrees(a, f, p, y, this.addition.ref),
          x = m.tree.find((S) => S.path === l),
          _ = m.tree.find((S) => S.path === g)
        if (!x || !_) throw new Error("Object not found during move")
        let b = await this.client.newTree(h, [
          { path: x.path, mode: x.mode, type: x.type, sha: null },
          { path: _.path, mode: _.mode, type: _.type, sha: v },
        ])
        c = await this.client.renewParentTrees(d, h, b, "/", this.addition.ref)
      } else if (o.startsWith(a)) {
        let { tree: f, dirSha: p } = await this.client.getTreeDirectly(
            d,
            this.addition.ref,
          ),
          h = f.tree.find((C) => C.path === l)
        if (!h) throw new Error("Object not found")
        if (h.type === "commit") throw new Error("cannot move a submodule")
        let m = [{ path: h.path, mode: h.mode, type: h.type, sha: null }]
        f.tree.length === 1 &&
          m.push({
            path: ".gitkeep",
            mode: "100644",
            type: "blob",
            content: "",
          })
        let w = await this.client.newTree(p, m),
          y = o.slice(a.length).replace(/^\//, "").split("/")[0]
        if (!y) throw new Error("cannot move in place")
        let v = Wt(a, y),
          x = await this.client.renewParentTrees(d, p, w, v, this.addition.ref),
          { tree: _, dirSha: b } = await this.client.getTreeDirectly(
            a,
            this.addition.ref,
          ),
          S = _.tree.find((C) => C.path === y)
        if (!S) throw new Error("Object not found")
        let A = await this.client.newTree(b, [
          { path: S.path, mode: S.mode, type: S.type, sha: x },
          { path: h.path, mode: h.mode, type: h.type, sha: h.sha },
        ])
        c = await this.client.renewParentTrees(a, b, A, "/", this.addition.ref)
      } else {
        let {
            dstOldSha: f,
            dstNewSha: p,
            srcParentOldSha: h,
            srcParentTree: m,
          } = await this.copyWithoutRenewTree(o, a),
          w = m.tree.find((T) => T.path === l)
        if (!w) throw new Error("Object not found")
        let g = [{ path: w.path, mode: w.mode, type: w.type, sha: null }]
        m.tree.length === 1 &&
          g.push({
            path: ".gitkeep",
            mode: "100644",
            type: "blob",
            content: "",
          })
        let y = await this.client.newTree(h, g),
          { ancestor: v, aChildName: x, bChildName: _ } = $c(o, a),
          b = await this.client.renewParentTrees(
            a,
            f,
            p,
            Wt(v, _),
            this.addition.ref,
          ),
          S = await this.client.renewParentTrees(
            d,
            h,
            y,
            Wt(v, x),
            this.addition.ref,
          ),
          { tree: A, dirSha: C } = await this.client.getTreeDirectly(
            v,
            this.addition.ref,
          ),
          P = A.tree.find((T) => T.path === x),
          k = A.tree.find((T) => T.path === _)
        if (!P || !k) throw new Error("Ancestor child tree not found")
        let D = await this.client.newTree(C, [
          { path: P.path, mode: P.mode, type: P.type, sha: S },
          { path: k.path, mode: k.mode, type: k.type, sha: b },
        ])
        c = await this.client.renewParentTrees(v, C, D, "/", this.addition.ref)
      }
      let u = kt(
        this.addition.move_commit_message,
        {
          UserName: "OpenListNext",
          ObjName: l,
          ObjPath: o,
          ParentName: ge(d),
          ParentPath: d,
          TargetName: ge(a),
          TargetPath: a,
        },
        "move",
      )
      await this.commitAndPush(u, c)
    })
  }
  async copy(e, t, i, s, n) {
    if (!this.isOnBranch)
      throw new Error("cannot write to non-branch reference")
    let o = re(s),
      a = re(t)
    if (a.startsWith(o)) throw new Error("cannot copy parent dir to child")
    await this.acquireLock(async () => {
      let { dstOldSha: c, dstNewSha: d } = await this.copyWithoutRenewTree(
          o,
          a,
        ),
        l = await this.client.renewParentTrees(a, c, d, "/", this.addition.ref),
        u = kt(
          this.addition.copy_commit_message,
          {
            UserName: "OpenListNext",
            ObjName: ge(o),
            ObjPath: o,
            ParentName: ge(We(o)),
            ParentPath: We(o),
            TargetName: ge(a),
            TargetPath: a,
          },
          "copy",
        )
      await this.commitAndPush(u, l)
    })
  }
  async copyWithoutRenewTree(e, t) {
    let i = await this.client.getContents(t, this.addition.ref)
    if (!i.entries && i.type !== "dir") throw new Error(`${t} is not a folder`)
    let s = We(e),
      n = ge(e),
      { tree: o, dirSha: a } = await this.client.getTreeDirectly(
        s,
        this.addition.ref,
      ),
      c = o.tree.find((u) => u.path === n)
    if (!c) throw new Error(`Object not found: ${e}`)
    if (c.type === "commit") throw new Error("cannot copy a submodule")
    let d = [{ path: c.path, mode: c.mode, type: c.type, sha: c.sha }]
    i.entries?.length === 1 &&
      i.entries[0].name === ".gitkeep" &&
      d.push({ path: ".gitkeep", mode: "100644", type: "blob", sha: null })
    let l = await this.client.newTree(i.sha, d)
    return {
      dstOldSha: i.sha,
      dstNewSha: l,
      srcParentOldSha: a,
      srcParentTree: o,
      ancestorOldSha: a,
    }
  }
}
fe()
var Ie = lr(Dr(), 1),
  Vd = "https://api-pan.xunlei.com/drive/v1",
  Ze = `${Vd}/files`,
  Ow = `${Vd}/tasks`,
  Jd = "https://xluser-ssl.xunlei.com",
  xs = `${Jd}/v1`,
  Mn = "drive#folder",
  Qd = "drive#file"
var Hn = "UPLOAD_TYPE_RESUMABLE"
var Up = "access_end_point_token",
  Xd = "40",
  qp = "34a062aaa22f906fca4fefe9fb3a3021"
function St(r) {
  return Ie.default.MD5(r).toString(Ie.default.enc.Hex)
}
function Wd(r, e) {
  let t = e.match(/:\/\/[^/]+((\/[^/\s?#]+)*)/),
    i = t ? t[1] : e
  return `${r}:${i}`
}
function Gd(r, e) {
  let t = `${r}${e}${Xd}${qp}`,
    i = Ie.default.SHA1(t).toString(Ie.default.enc.Hex),
    s = Ie.default.MD5(i).toString(Ie.default.enc.Hex)
  return `div101.${r}${s}`
}
function Yd(r) {
  let e = r.length,
    t = 262144
  for (; e / t > 512 && t < 2097152; ) t = t << 1
  let i = []
  for (let n = 0; n < e; n += t) {
    let o = r.subarray(n, Math.min(n + t, e)),
      a = Ie.default.lib.WordArray.create(o),
      c = Ie.default.SHA1(a)
    i.push(c)
  }
  let s = Ie.default.lib.WordArray.create()
  for (let n of i) s.concat(n)
  return Ie.default.SHA1(s).toString(Ie.default.enc.Hex)
}
var Fr = class {
  options
  tokenResp = null
  coreLoginResp = null
  captchaToken = ""
  creditKey = ""
  constructor(e) {
    ;((this.options = e),
      (this.captchaToken = e.captchaToken || ""),
      (this.creditKey = e.creditKey || ""))
  }
  getCaptchaSign() {
    if (!this.options.algorithms || this.options.algorithms.length === 0)
      return {
        timestamp: this.options.timestamp || "",
        sign: this.options.captchaSign || "",
      }
    let e = Date.now().toString(),
      t = `${this.options.clientId}${this.options.clientVersion}${this.options.packageName}${this.options.deviceId}${e}`
    for (let i of this.options.algorithms) t = St(t + i)
    return { timestamp: e, sign: `1.${t}` }
  }
  async refreshCaptchaToken(e, t) {
    let i = {
        action: e,
        captcha_token: this.captchaToken,
        client_id: this.options.clientId,
        device_id: this.options.deviceId,
        meta: t,
        redirect_uri: "xlaccsdk01://xunlei.com/callback?state=harbor",
      },
      s = await this.rawRequest(`${xs}/shield/captcha/init`, {
        method: "POST",
        body: i,
      })
    if (s.error_code || (s.error && s.error !== "success"))
      throw new Error(
        `Captcha error: ${s.error_code} ${s.error} ${s.error_description || ""}`,
      )
    if (s.url)
      throw new Error(
        `need verify: <a target="_blank" href="${s.url}">Click Here</a>`,
      )
    if (!s.captcha_token) throw new Error("empty captchaToken")
    ;((this.captchaToken = s.captcha_token),
      this.options.onPersistCaptchaToken &&
        (await this.options.onPersistCaptchaToken(s.captcha_token)))
  }
  async refreshCaptchaTokenAtLogin(e, t) {
    let { timestamp: i, sign: s } = this.getCaptchaSign(),
      n = {
        client_version: this.options.clientVersion,
        package_name: this.options.packageName,
        user_id: t,
        timestamp: i,
        captcha_sign: s,
      }
    await this.refreshCaptchaToken(e, n)
  }
  async refreshCaptchaTokenInLogin(e, t) {
    let i = {}
    ;(/\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/.test(t)
      ? (i.email = t)
      : t.length >= 11 && t.length <= 18
        ? (i.phone_number = t)
        : (i.username = t),
      await this.refreshCaptchaToken(e, i))
  }
  formatReviewData(e) {
    let t = Gd(this.options.deviceId, this.options.packageName),
      i = {
        creditkey: e.creditkey,
        reviewurl: `${e.reviewurl}&deviceid=${t}`,
        deviceid: t,
        devicesign: t,
      },
      n = `
<div style="font-family: Arial, sans-serif; padding: 15px; border-radius: 5px; border: 1px solid #e0e0e0;">
    <h3 style="color: #d9534f; margin-top: 0;">
        <span style="font-size: 16px;">\u{1F512} \u672C\u6B21\u767B\u5F55\u9700\u8981\u9A8C\u8BC1</span><br>
        <span style="font-size: 14px; font-weight: normal; color: #666;">This login requires verification</span>
    </h3>
    <p style="font-size: 14px; margin-bottom: 15px;">\u4E0B\u9762\u662F\u9A8C\u8BC1\u6240\u9700\u8981\u7684\u6570\u636E\uFF0C\u5177\u4F53\u4F7F\u7528\u65B9\u6CD5\u8BF7\u53C2\u7167\u5BF9\u5E94\u7684\u9A71\u52A8\u6587\u6863<br>
    <span style="color: #666; font-size: 13px;">Below are the relevant verification data. For specific usage methods, please refer to the corresponding driver documentation.</span></p>
    <div style="border: 1px solid #ddd; border-radius: 4px; padding: 10px; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 13px;">
        <pre style="margin: 0; white-space: pre-wrap;"><code>${JSON.stringify(i, null, 2)}</code></pre>
    </div>
</div>`
    return new Error(n)
  }
  async rawRequest(e, t = {}) {
    let i = {
        "user-agent": this.options.userAgent,
        accept: "application/json;charset=UTF-8",
        "x-device-id": this.options.deviceId,
        "x-client-id": this.options.clientId,
        "x-client-version": this.options.clientVersion,
        ...(t.headers || {}),
      },
      s
    t.body !== void 0 &&
      (typeof t.body == "string"
        ? (s = t.body)
        : ((s = JSON.stringify(t.body)),
          i["content-type"] ||
            (i["content-type"] = "application/json;charset=UTF-8")))
    let n = await fetch(e, { method: t.method || "GET", headers: i, body: s }),
      o = await n.text(),
      a = {}
    try {
      a = JSON.parse(o)
    } catch {
      if (!n.ok) throw new Error(`${n.status} ${n.statusText}: ${o}`)
      return o
    }
    if (a.error === "review_panel") throw this.formatReviewData(a)
    return a
  }
  async authRequest(e, t = {}) {
    if (!this.tokenResp?.access_token) throw new Error("empty token")
    let i = {
        Authorization: `${this.tokenResp.token_type} ${this.tokenResp.access_token}`,
        "X-Captcha-Token": this.captchaToken,
        ...(t.headers || {}),
      },
      s = await this.rawRequest(e, { ...t, headers: i }),
      n = s?.error_code || 0
    if (n === 4122 || n === 4121 || n === 10 || n === 16) {
      if (this.tokenResp?.refresh_token) {
        let o = await this.refreshToken(this.tokenResp.refresh_token)
        return (
          (this.tokenResp = o),
          this.options.onPersistToken && (await this.options.onPersistToken(o)),
          this.authRequest(e, t)
        )
      }
      throw new Error(`Token expired error ${n}`)
    } else if (n === 9) {
      let o = Wd(t.method || "GET", e)
      return (
        await this.refreshCaptchaTokenAtLogin(o, this.tokenResp.user_id || ""),
        this.authRequest(e, t)
      )
    } else if (n !== 0 || (s.error && s.error !== "success"))
      throw new Error(
        `ErrorCode: ${s.error_code || 0}, Error: ${s.error || ""}, ErrorDescription: ${s.error_description || ""}`,
      )
    return s
  }
  async coreLogin(e, t) {
    let i = `${Jd}/xluser.core.login/v3/login`,
      s = {
        protocolVersion: "301",
        sequenceNo: "1000012",
        platformVersion: "10",
        isCompressed: "0",
        appid: Xd,
        clientVersion: this.options.clientVersion,
        peerID: "00000000000000000000000000000000",
        appName: "ANDROID-com.xunlei.downloadprovider",
        sdkVersion: "512000",
        devicesign: Gd(this.options.deviceId, this.options.packageName),
        netWorkType: "WIFI",
        providerName: "NONE",
        deviceModel: "M2004J7AC",
        deviceName: "Xiaomi_M2004j7ac",
        OSVersion: "12",
        creditkey: this.creditKey,
        hl: "zh-CN",
        userName: e,
        passWord: t,
        verifyKey: "",
        verifyCode: "",
        isMd5Pwd: "0",
      },
      n = await this.rawRequest(i, {
        method: "POST",
        body: s,
        headers: {
          "user-agent":
            "android-ok-http-client/xl-acc-sdk/version-5.0.12.512000",
        },
      })
    return ((this.coreLoginResp = n), n)
  }
  async login(e, t) {
    let s = (await this.coreLogin(e, t)).sessionID,
      n = `${xs}/auth/signin/token`
    await this.refreshCaptchaTokenInLogin(Wd("POST", n), e)
    let o = await this.rawRequest(n, {
      method: "POST",
      body: {
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
        provider: Up,
        signin_token: s,
      },
    })
    return (
      (this.tokenResp = o),
      (this.creditKey = ""),
      this.options.onPersistToken && (await this.options.onPersistToken(o)),
      o
    )
  }
  async refreshToken(e) {
    let t = `${xs}/auth/token`,
      i = await this.rawRequest(t, {
        method: "POST",
        body: {
          grant_type: "refresh_token",
          refresh_token: e,
          client_id: this.options.clientId,
          client_secret: this.options.clientSecret,
        },
      })
    return (
      (this.tokenResp = i),
      this.options.onPersistToken && (await this.options.onPersistToken(i)),
      i
    )
  }
  async isLogin() {
    if (!this.tokenResp?.access_token) return !1
    try {
      return (await this.authRequest(`${xs}/user/me`, { method: "GET" }), !0)
    } catch {
      return !1
    }
  }
}
function Zd(r, e, t) {
  let i = r.kind === Mn,
    s = r.web_content_link || ""
  if (t && r.medias && r.medias.length > 0) {
    for (let n of r.medias)
      if (n.link?.url) {
        s = n.link.url
        break
      }
  }
  return {
    name: r.name,
    size: parseInt(r.size || "0", 10),
    is_dir: i,
    modified: r.modified_time || r.created_time || new Date().toISOString(),
    sign: "",
    type: L(r.name, i),
    thumb: r.thumbnail_link || r.icon_link || "",
    raw_url: s,
    raw_url_headers: { "User-Agent": e },
  }
}
function el(r) {
  if (r?.device_id && r.device_id.trim().length === 32)
    return r.device_id.trim()
  let e = `${r?.username || ""}${r?.password || ""}`
  return e.trim()
    ? St(e)
    : St(Math.random().toString(36) + Date.now().toString(36))
}
var Tr = class {
    client
    addition
    identity = ""
    onPersistCallback
    constructor(e, t) {
      ;((this.addition = e), (this.onPersistCallback = t))
      let i = el(e)
      ;((e.device_id = i),
        (this.client = new Fr({
          deviceId: i,
          clientId: "Xp6vsxz_7IYVw2BB",
          clientSecret: "Xp6vsy4tN9toTVdMSpomVdXpRmES",
          clientVersion: "8.31.0.9726",
          packageName: "com.xunlei.downloadprovider",
          userAgent:
            "ANDROID-com.xunlei.downloadprovider/8.31.0.9726 netWorkType/5G appid/40 deviceName/Xiaomi_M2004j7ac deviceModel/M2004J7AC OSVersion/12 protocolVersion/301 platformVersion/10 sdkVersion/512000 Oauth2Client/0.9 (Linux 4_14_186-perf-gddfs8vbb238b) (JAVA 0)",
          downloadUserAgent:
            "Dalvik/2.1.0 (Linux; U; Android 12; M2004J7AC Build/SP1A.210812.016)",
          algorithms: [
            "9uJNVj/wLmdwKrJaVj/omlQ",
            "Oz64Lp0GigmChHMf/6TNfxx7O9PyopcczMsnf",
            "Eb+L7Ce+Ej48u",
            "jKY0",
            "ASr0zCl6v8W4aidjPK5KHd1Lq3t+vBFf41dqv5+fnOd",
            "wQlozdg6r1qxh0eRmt3QgNXOvSZO6q/GXK",
            "gmirk+ciAvIgA/cxUUCema47jr/YToixTT+Q6O",
            "5IiCoM9B1/788ntB",
            "P07JH0h6qoM6TSUAK2aL9T5s2QBVeY9JWvalf",
            "+oK0AN",
          ],
          space: e.space || "",
          captchaToken: e.captcha_token || "",
          creditKey: e.credit_key || "",
          onPersistToken: async (s) => {
            this.onPersistCallback &&
              (await this.onPersistCallback({
                refresh_token: s.refresh_token,
                captcha_token: this.client.captchaToken,
                device_id: i,
              }))
          },
          onPersistCaptchaToken: async (s) => {
            this.onPersistCallback &&
              (await this.onPersistCallback({ captcha_token: s }))
          },
        })))
    }
    get downloadUserAgent() {
      return (
        this.addition.download_user_agent ||
        "Dalvik/2.1.0 (Linux; U; Android 12; M2004J7AC Build/SP1A.210812.016)"
      )
    }
    get useVideoUrl() {
      return !!this.addition.use_video_url
    }
    async init() {
      let e = this.addition.username || "",
        t = this.addition.password || "",
        i = St(`${e}${t}`)
      ;(this.identity !== i || !(await this.client.isLogin())) &&
        ((this.identity = i), await this.client.login(e, t))
    }
    resolveFolderId(e) {
      if (!e || e === "/" || e === "0")
        return this.addition.root_folder_id || ""
      let t = e.split("/").filter(Boolean)
      return t[t.length - 1] || this.addition.root_folder_id || ""
    }
    async list(e, t) {
      let i = this.resolveFolderId(t),
        s = [],
        n = ""
      for (;;) {
        let o = new URL(Ze)
        ;(o.searchParams.set("space", this.addition.space || ""),
          o.searchParams.set("__type", "drive"),
          o.searchParams.set("refresh", "true"),
          o.searchParams.set("__sync", "true"),
          o.searchParams.set("parent_id", i),
          o.searchParams.set("page_token", n),
          o.searchParams.set("with_audit", "true"),
          o.searchParams.set("limit", "100"),
          o.searchParams.set(
            "filters",
            JSON.stringify({
              phase: { eq: "PHASE_TYPE_COMPLETE" },
              trashed: { eq: !1 },
            }),
          ))
        let a = await this.client.authRequest(o.toString(), { method: "GET" })
        if (a.files && a.files.length > 0)
          for (let c of a.files)
            s.push(Zd(c, this.downloadUserAgent, this.useVideoUrl))
        if (!a.next_page_token) break
        n = a.next_page_token
      }
      return G(s, this.addition.order_by, this.addition.order_direction)
    }
    async get(e, t) {
      let i = this.resolveFolderId(t),
        s = new URL(`${Ze}/${i}`)
      s.searchParams.set("space", this.addition.space || "")
      let n = await this.client.authRequest(s.toString(), { method: "GET" })
      return Zd(n, this.downloadUserAgent, this.useVideoUrl)
    }
    async mkdir(e, t) {
      let i = t.split("/").filter(Boolean),
        s = i.pop() || "new_folder",
        n = "/" + i.join("/"),
        o = this.resolveFolderId(n)
      await this.client.authRequest(Ze, {
        method: "POST",
        body: {
          kind: Mn,
          name: s,
          parent_id: o,
          space: this.addition.space || "",
        },
      })
    }
    async rename(e, t, i) {
      let s = this.resolveFolderId(t)
      await this.client.authRequest(`${Ze}/${s}`, {
        method: "PATCH",
        body: { name: i, space: this.addition.space || "" },
      })
    }
    async remove(e, t, i) {
      let s = this.resolveFolderId(t),
        n = new URL(`${Ze}/${s}/trash`)
      ;(n.searchParams.set("space", this.addition.space || ""),
        await this.client.authRequest(n.toString(), {
          method: "PATCH",
          body: {},
        }))
    }
    async move(e, t, i, s, n) {
      let o = this.resolveFolderId(s),
        a = this.resolveFolderId(t)
      await this.client.authRequest(`${Ze}:batchMove`, {
        method: "POST",
        body: {
          to: { parent_id: a },
          ids: [o],
          space: this.addition.space || "",
        },
      })
    }
    async copy(e, t, i, s, n) {
      let o = this.resolveFolderId(s),
        a = this.resolveFolderId(t)
      await this.client.authRequest(`${Ze}:batchCopy`, {
        method: "POST",
        body: {
          to: { parent_id: a },
          ids: [o],
          space: this.addition.space || "",
        },
      })
    }
    async put(e, t, i) {
      let s = t.split("/").filter(Boolean),
        n = s.pop() || "file",
        o = "/" + s.join("/"),
        a = this.resolveFolderId(o),
        c = Yd(i),
        d = await this.client.authRequest(Ze, {
          method: "POST",
          body: {
            kind: Qd,
            parent_id: a,
            name: n,
            size: i.length.toString(),
            hash: c,
            upload_type: Hn,
            space: this.addition.space || "",
          },
        })
      if (d.upload_type === Hn && d.resumable?.params) {
        let l = d.resumable.params,
          u = l.endpoint
        ;(u.startsWith(l.bucket + ".") && (u = u.slice(l.bucket.length + 1)),
          !u.startsWith("http://") &&
            !u.startsWith("https://") &&
            (u = `https://${u}`))
        let f = `${u.replace(/\/$/, "")}/${l.bucket}/${l.key}`,
          p = { "x-amz-security-token": l.security_token },
          h = await fetch(f, { method: "PUT", headers: p, body: i })
        if (!h.ok)
          throw new Error(`S3 Upload failed: ${h.status} ${h.statusText}`)
      }
    }
  },
  _s = class extends Tr {
    constructor(e, t) {
      super(e, t)
      let i = el(e)
      e.device_id = i
      let s =
        e.sign_type === "captcha_sign"
          ? void 0
          : (e.algorithms || "")
              .split(",")
              .map((n) => n.trim())
              .filter(Boolean)
      this.client = new Fr({
        deviceId: i,
        clientId: e.client_id || "Xp6vsxz_7IYVw2BB",
        clientSecret: e.client_secret || "Xp6vsy4tN9toTVdMSpomVdXpRmES",
        clientVersion: e.client_version || "8.31.0.9726",
        packageName: e.package_name || "com.xunlei.downloadprovider",
        userAgent:
          e.user_agent ||
          "ANDROID-com.xunlei.downloadprovider/8.31.0.9726 netWorkType/5G appid/40 deviceName/Xiaomi_M2004j7ac deviceModel/M2004J7AC OSVersion/12 protocolVersion/301 platformVersion/10 sdkVersion/512000 Oauth2Client/0.9 (Linux 4_14_186-perf-gddfs8vbb238b) (JAVA 0)",
        downloadUserAgent:
          e.download_user_agent ||
          "Dalvik/2.1.0 (Linux; U; Android 12; M2004J7AC Build/SP1A.210812.016)",
        algorithms: s && s.length > 0 ? s : void 0,
        timestamp: e.timestamp,
        captchaSign: e.captcha_sign,
        useVideoUrl: e.use_video_url,
        space: e.space || "",
        captchaToken: e.captcha_token || "",
        creditKey: e.credit_key || "",
        onPersistToken: async (n) => {
          this.onPersistCallback &&
            (await this.onPersistCallback({
              refresh_token: n.refresh_token,
              captcha_token: this.client.captchaToken,
              device_id: i,
            }))
        },
        onPersistCaptchaToken: async (n) => {
          this.onPersistCallback &&
            (await this.onPersistCallback({ captcha_token: n }))
        },
      })
    }
    async init() {
      let e = this.addition,
        t = ""
      ;(e.login_type === "refresh_token"
        ? (t = St(e.refresh_token || ""))
        : (t = St(`${e.username || ""}${e.password || ""}`)),
        (this.identity !== t || !(await this.client.isLogin())) &&
          ((this.identity = t),
          e.login_type === "refresh_token" && e.refresh_token
            ? await this.client.refreshToken(e.refresh_token)
            : e.username &&
              e.password &&
              (await this.client.login(e.username, e.password))))
    }
  }
fe()
var Op = /([0-9.]*)\s*([\u4e00-\u9fa5]+)/,
  $p = /([0-9.]+)\s*([bkm]+)/i,
  jp = /arg1='([0-9A-Z]+)'/i
function tl(r) {
  if (!r) return new Date().toISOString()
  let e = r.trim(),
    t = new Date(e)
  if (!isNaN(t.getTime())) return t.toISOString()
  let i = Date.now(),
    s = 864e5,
    n = e.match(Op)
  if (n) {
    let o = parseFloat(n[1]) || 0,
      a = n[2]
    if (a.includes("\u79D2\u524D")) return new Date(i - o * 1e3).toISOString()
    if (a.includes("\u5206") || a.includes("\u5206\u949F\u524D"))
      return new Date(i - o * 6e4).toISOString()
    if (a.includes("\u5C0F\u65F6\u524D") || a.includes("\u5C0F\u65F6"))
      return new Date(i - o * 36e5).toISOString()
    if (a.includes("\u5929\u524D") || a.includes("\u5929"))
      return new Date(i - o * s).toISOString()
    if (a.includes("\u6628\u5929")) return new Date(i - s).toISOString()
    if (a.includes("\u524D\u5929")) return new Date(i - s * 2).toISOString()
  }
  return new Date().toISOString()
}
function rl(r) {
  if (!r) return 0
  let e = r.trim().match($p)
  if (!e) return 0
  let t = parseFloat(e[1])
  switch (e[2].toUpperCase()) {
    case "B":
      return Math.floor(t)
    case "K":
      return Math.floor(t * 1024)
    case "M":
      return Math.floor(t * 1048576)
    case "G":
      return Math.floor(t * 1073741824)
    default:
      return 0
  }
}
function Ir(r) {
  return r.replace(/<!--[\s\S]*?-->|[^:]\/\/.*|\/\*[\s\S]*?\*\//g, (e) =>
    e.slice(1, 3) === "//"
      ? e.slice(0, 1)
      : `
`,
  )
}
function il(r) {
  let e = "",
    t = !1,
    i = !1
  for (let s = 0; s < r.length; s++) {
    let n = r[s]
    if (
      i &&
      (n ===
        `
` ||
        n === "\r")
    ) {
      ;((i = !1), (e += n))
      continue
    }
    if (t && n === "*" && s + 1 < r.length && r[s + 1] === "/") {
      ;((t = !1), s++)
      continue
    }
    if (!(t || i)) {
      if (n === "/" && s + 1 < r.length) {
        let o = r[s + 1]
        if (o === "*") {
          ;((t = !0), s++)
          continue
        } else if (o === "/") {
          ;((i = !0), s++)
          continue
        }
      }
      e += n
    }
  }
  return e
}
function zp(r) {
  let e = [
      6, 28, 34, 31, 33, 18, 30, 23, 9, 8, 19, 38, 17, 24, 0, 5, 32, 21, 10, 22,
      25, 14, 15, 3, 16, 27, 13, 35, 2, 29, 11, 26, 4, 36, 1, 39, 37, 7, 20, 12,
    ],
    t = new Array(r.length).fill("")
  for (let i = 0; i < e.length; i++) {
    let s = e[i]
    s < t.length && i < r.length && (t[s] = r[i])
  }
  return t.join("")
}
function Lp(r, e) {
  let t = Math.min(r.length, e.length),
    i = Math.floor(t / 2),
    s = ""
  for (let n = 0; n < i; n++) {
    let o = parseInt(r.slice(n * 2, n * 2 + 2), 16),
      a = parseInt(e.slice(n * 2, n * 2 + 2), 16),
      c = o ^ a
    s += c.toString(16).padStart(2, "0")
  }
  return s
}
function vs(r) {
  let e = r.match(jp)
  if (!e || e.length < 2)
    throw new Error(
      "[Lanzou] \u65E0\u6CD5\u5339\u914D\u5230 acw_sc__v2 \u7684 arg1 \u53C2\u6570",
    )
  let t = e[1]
  return Lp(zp(t), "3000176000856006061501533003690027800375")
}
function Np(r, e) {
  if (!r || !e) return ""
  if (r !== "sasign") {
    let t = e.match(
      new RegExp(
        `(?:var|let|const)\\s+${r}\\s*=\\s*['"]?([\\s\\S]*?)['"]?;`,
        "i",
      ),
    )
    if (t) return t[1].trim().replace(/^['"]|['"]$/g, "")
    let i = e.match(
      new RegExp(`(?:^|[;,\\s])${r}\\s*=\\s*['"]?([\\s\\S]*?)['"]?;`, "im"),
    )
    if (i) return i[1].trim().replace(/^['"]|['"]$/g, "")
    let s = e.match(
      new RegExp(`['"]?${r}['"]?\\s*:\\s*['"]?([\\s\\S]*?)['"]?`, "i"),
    )
    return s ? s[1].trim().replace(/^['"]|['"]$/g, "") : ""
  } else {
    let t = Array.from(
      e.matchAll(
        new RegExp(
          `(?:var|let|const)?\\s*${r}\\s*=\\s*['"]?([\\s\\S]*?)['"]?;`,
          "gi",
        ),
      ),
    )
    if (t.length === 3) return t[1][1].trim().replace(/^['"]|['"]$/g, "")
    if (t.length > 0) return t[0][1].trim().replace(/^['"]|['"]$/g, "")
  }
  return ""
}
function Mp(r, e) {
  let t = {},
    i = /['"]?([a-zA-Z0-9_$]+)['"]?\s*:\s*(['"]?([^'",}\s]+)['"]?)/g,
    s = r.matchAll(i)
  for (let n of s) {
    let o = n[1],
      a = n[2],
      c = n[3]
    if (!c) t[o] = ""
    else if (a.includes("'") || a.includes('"') || /^\d+$/.test(a)) t[o] = c
    else {
      let d = Np(c, e)
      t[o] = d !== "" ? d : c
    }
  }
  return t
}
function Hp(r) {
  let e = {},
    t = r.split("&")
  for (let i of t) {
    let [s, n] = i.split("=")
    s && (e[decodeURIComponent(s)] = decodeURIComponent(n || ""))
  }
  return e
}
function Gt(r, e) {
  let t = e || r,
    i = Array.from(r.matchAll(/data\s*:\s*({[\s\S]*?})/g))
  if (i.length > 0) {
    let n = i[0][1]
    for (let a of i) a[1].length > n.length && (n = a[1])
    let o = Mp(n, t)
    if (Object.keys(o).length > 0) return o
  }
  let s = r.match(/data\s*:\s*['"]([^'"]+)['"]/)
  if (s && s[1].includes("=")) return Hp(s[1])
  throw new Error(
    "[Lanzou] \u672A\u80FD\u627E\u5230\u8BF7\u6C42\u53C2\u6570 data \u5BF9\u8C61",
  )
}
function sl(r, e) {
  let t = new RegExp(`function\\s+${e}\\s*\\([^)]*\\)\\s*\\{`, "i"),
    i = r.search(t)
  if (i === -1) throw new Error(`[Lanzou] \u672A\u627E\u5230\u51FD\u6570 ${e}`)
  let s = 0,
    n = -1
  for (let o = i; o < r.length; o++)
    if (r[o] === "{") (s === 0 && (n = o), s++)
    else if (r[o] === "}" && (s--, s === 0)) return r.slice(i, o + 1)
  return r.slice(i)
}
var bs = class {
  addition
  cookie = ""
  uid = ""
  vei = ""
  onCookieUpdate
  constructor(e, t) {
    ;((this.addition = e),
      (this.cookie = (e.cookie || "").trim()),
      (this.onCookieUpdate = t))
  }
  getBaseUrl() {
    return (
      this.addition.baseUrl ||
      this.addition.base_url ||
      "https://pc.woozooo.com"
    ).replace(/\/$/, "")
  }
  getShareUrl() {
    return (
      this.addition.shareUrl ||
      this.addition.share_url ||
      "https://pan.lanzoui.com"
    ).replace(/\/$/, "")
  }
  getUserAgent() {
    return (
      this.addition.user_agent ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
  }
  getCookie() {
    return this.cookie
  }
  updateCookie(e) {
    if (!e) return
    let t = this.cookie ? this.cookie.split(";").map((n) => n.trim()) : [],
      i = e.split(/,(?=[a-zA-Z0-9_\-]+=[^;]+)/)
    for (let n of i) {
      let o = n.split(";")[0].trim(),
        a = o.indexOf("=")
      if (a > 0) {
        let c = o.slice(0, a).trim(),
          d = o.slice(a + 1).trim(),
          l = t.findIndex((u) => u.startsWith(`${c}=`))
        l !== -1 ? (t[l] = `${c}=${d}`) : t.push(`${c}=${d}`)
      }
    }
    let s = t.filter(Boolean).join("; ")
    s !== this.cookie && ((this.cookie = s), this.onCookieUpdate?.(this.cookie))
  }
  async init() {
    let e = this.addition.type || "cookie"
    e === "account"
      ? (await this.login(), await this.initVeiAndUid())
      : e === "cookie" && this.cookie && (await this.initVeiAndUid())
  }
  async login() {
    if (!this.addition.account || !this.addition.password)
      throw new Error(
        "[Lanzou] \u8D26\u53F7\u6A21\u5F0F\u4E0B\u5FC5\u987B\u63D0\u4F9B\u8D26\u53F7\u4E0E\u5BC6\u7801",
      )
    let e = ""
    for (let t = 0; t < 3; t++) {
      let i = {
        "User-Agent": this.getUserAgent(),
        Referer: "https://pc.woozooo.com",
        "Content-Type": "application/x-www-form-urlencoded",
      }
      e && (i.Cookie = `acw_sc__v2=${e}`)
      let s = await fetch("https://up.woozooo.com/mlogin.php", {
        method: "POST",
        headers: i,
        body: new URLSearchParams({
          task: "3",
          uid: this.addition.account,
          pwd: this.addition.password,
          setSessionId: "",
          setSig: "",
          setScene: "",
          setTocen: "",
          formhash: "",
        }),
      })
      this.updateCookie(s.headers.get("set-cookie"))
      let n = await s.text()
      if (n.includes("acw_sc__v2")) {
        e = vs(n)
        continue
      }
      let o
      try {
        o = JSON.parse(n)
      } catch {
        throw new Error(
          `[Lanzou] \u767B\u5F55\u54CD\u5E94\u5F02\u5E38: ${n.slice(0, 200)}`,
        )
      }
      if (o.zt !== 1)
        throw new Error(`[Lanzou] \u767B\u5F55\u5931\u8D25: ${o.info || n}`)
      return
    }
    throw new Error(
      "[Lanzou] \u767B\u5F55\u591A\u6B21\u89E6\u53D1 WAF \u6821\u9A8C\u5931\u8D25",
    )
  }
  async initVeiAndUid() {
    let e = await this.request(
        `${this.getBaseUrl()}/mydisk.php?item=files&action=index`,
        "GET",
      ),
      t = e.match(/uid=([^'"&;]+)/)
    if (!t)
      throw new Error(
        "[Lanzou] \u672A\u80FD\u83B7\u53D6\u5230 uid\uFF0C\u8BF7\u68C0\u67E5 Cookie \u662F\u5426\u6709\u6548",
      )
    this.uid = t[1]
    let i = Ir(e)
    try {
      let s = Gt(i)
      this.vei = s.vei || ""
    } catch {
      let s = e.match(/['"]?vei['"]?\s*:\s*['"]?([^'",\s]+)['"]?/)
      s && (this.vei = s[1])
    }
  }
  async request(e, t = "GET", i, s) {
    let n = "",
      o =
        e.startsWith(this.getShareUrl()) ||
        e.includes("ajaxm.php") ||
        e.includes("filemoreajax.php")
          ? this.getShareUrl()
          : this.getBaseUrl()
    for (let a = 0; a < 3; a++) {
      let c = {
          Referer: s || o,
          "User-Agent": this.getUserAgent(),
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        },
        d = this.cookie
      ;(e.includes("/file/") && (d = (d ? d + "; " : "") + "down_ip=1"),
        n && (d = (d ? d + "; " : "") + `acw_sc__v2=${n}`),
        d && (c.Cookie = d))
      let l
      i &&
        t === "POST" &&
        ((c["Content-Type"] =
          "application/x-www-form-urlencoded; charset=UTF-8"),
        (l = new URLSearchParams(i).toString()))
      let u = await fetch(e, { method: t, headers: c, body: l })
      this.updateCookie(u.headers.get("set-cookie"))
      let f = await u.text()
      if (f.includes("acw_sc__v2")) {
        n = vs(f)
        continue
      }
      return f
    }
    throw new Error(
      "[Lanzou] \u8BF7\u6C42\u89E6\u53D1 acw_sc__v2 \u6821\u9A8C\u8D85\u9650",
    )
  }
  async doupload(e) {
    let t = `${this.getBaseUrl()}/doupload.php?uid=${this.uid}&vei=${this.vei}`,
      i = await this.request(t, "POST", e),
      s
    try {
      s = JSON.parse(i)
    } catch {
      throw new Error(`[Lanzou] \u975E JSON \u54CD\u5E94: ${i.slice(0, 200)}`)
    }
    if (s.zt === 9) {
      if (this.addition.type === "account")
        return (
          await this.login(),
          await this.initVeiAndUid(),
          this.doupload(e)
        )
      throw new Error(
        "[Lanzou] Cookie \u5DF2\u8FC7\u671F\uFF0C\u8BF7\u66F4\u65B0 Cookie",
      )
    }
    if (s.zt !== 1 && s.zt !== 2 && s.zt !== 4)
      throw new Error(
        s.inf || s.info || `[Lanzou] API \u9519\u8BEF (zt: ${s.zt})`,
      )
    return s
  }
  async getAllFiles(e) {
    let t = await this.getFolders(e),
      i = await this.getFiles(e)
    return [...t, ...i]
  }
  async getFolders(e) {
    return (
      (await this.doupload({ task: "47", folder_id: e || "-1" })).text || []
    ).map((s) => ({
      ...s,
      name: s.name,
      fol_id: s.fol_id || s.id,
      is_folder: !0,
    }))
  }
  async getFiles(e) {
    let t = []
    for (let i = 1; ; i++) {
      let n =
        (
          await this.doupload({
            task: "5",
            folder_id: e || "-1",
            pg: String(i),
          })
        ).text || []
      if (n.length === 0) break
      t.push(
        ...n.map((o) => ({
          ...o,
          name_all: o.name_all || o.name,
          id: o.id,
          size: o.size,
          time: o.time,
          is_folder: !1,
        })),
      )
    }
    return t
  }
  async getFileShareUrlById(e) {
    return (await this.doupload({ task: "22", file_id: e })).info || {}
  }
  async getFileOrFolderByShareUrl(e, t = "") {
    let i = e.replace(/^\//, ""),
      s = await this.request(`${this.getShareUrl()}/${i}`, "GET")
    if (s.includes("\u53D6\u6D88\u5206\u4EAB"))
      throw new Error(
        "[Lanzou] \u8BE5\u6587\u4EF6\u5DF2\u53D6\u6D88\u5206\u4EAB",
      )
    if (s.includes("\u6587\u4EF6\u4E0D\u5B58\u5728"))
      throw new Error("[Lanzou] \u6587\u4EF6\u4E0D\u5B58\u5728")
    return /class="fileinfo"|id="file"|文件描述/i.test(s)
      ? [await this.getFilesByShareUrl(i, t, s)]
      : this.getFolderByShareUrl(t, s)
  }
  async getFolderByShareUrl(e, t) {
    let i = Ir(t),
      s = {}
    try {
      s = Gt(i)
    } catch {
      s = {}
    }
    let n = [],
      o = Array.from(
        t.matchAll(
          /(?:folderlink|mbxfolder)[^>]*href=["']\/?([^"']+)["'][^>]*>(.+?)<\//gi,
        ),
      )
    for (let a of o) n.push({ id: a[1], name_all: a[2].trim(), is_folder: !0 })
    s.pwd = e || this.addition.share_password || ""
    for (let a = 1; ; a++) {
      s.pg = String(a)
      let c = await this.request(
          `${this.getShareUrl()}/filemoreajax.php`,
          "POST",
          s,
        ),
        d
      try {
        d = JSON.parse(c)
      } catch {
        break
      }
      if (d.zt !== 1 || !Array.isArray(d.text) || d.text.length === 0) break
      let l = d.text
      n.push(
        ...l.map((u) => ({
          id: u.id,
          name_all: u.name_all || u.name,
          size: u.size,
          time: u.time,
          is_folder: !1,
          pwd: s.pwd,
        })),
      )
    }
    return n
  }
  async getFilesByShareUrl(e, t = "", i, s) {
    let n = e.replace(/^\//, ""),
      o = (s || this.getShareUrl()).replace(/\/+$/, ""),
      a = `${o}/${n}`,
      c = i
    ;(c || (c = await this.request(a, "GET")), (c = Ir(c)), (c = il(c)))
    let d = {},
      l = "",
      u = "",
      f = { id: n, is_folder: !1 }
    if (c.includes("pwdload") || c.includes("passwddiv")) {
      let y = sl(c, "down_p")
      ;((d = Gt(y, c)), (d.p = t || this.addition.share_password || ""))
      let v =
          y.match(/['"]?\/?ajaxm\.php\?file=(\d+)['"]?/) ||
          c.match(/['"]?\/?ajaxm\.php\?file=(\d+)['"]?/) ||
          y.match(/file\s*[:=]\s*['"]?(\d+)['"]?/) ||
          c.match(/file\s*[:=]\s*['"]?(\d+)['"]?/) ||
          y.match(/var\s+file_id\s*=\s*['"]?(\d+)['"]?/) ||
          c.match(/var\s+file_id\s*=\s*['"]?(\d+)['"]?/),
        x = v ? v[1] : ""
      if (!x) throw new Error("[Lanzou] \u672A\u627E\u5230\u6587\u4EF6 ID")
      let _ = await this.request(`${o}/ajaxm.php?file=${x}`, "POST", d, a),
        b
      try {
        b = JSON.parse(_)
      } catch {
        throw new Error(
          `[Lanzou] ajaxm.php \u54CD\u5E94\u683C\u5F0F\u9519\u8BEF: ${_}`,
        )
      }
      if (b.zt !== 1)
        throw new Error(
          b.info ||
            b.text ||
            `[Lanzou] \u5BC6\u7801\u9519\u8BEF\u6216\u63D0\u53D6\u94FE\u63A5\u5931\u8D25 (zt=${b.zt})`,
        )
      ;((f.name_all = b.inf || "download"),
        (l = `${b.dom}/file`),
        (u = `${l}/${b.url}`))
    } else {
      let y =
        c.match(/<iframe[^>]*?src=["']([^"']+)["']/i) ||
        c.match(/href=["'](\/fn\?[^"']+)["']/i) ||
        c.match(/["'](\/fn\?[^"']+)["']/i)
      if (!y)
        throw new Error(
          "[Lanzou] \u672A\u627E\u5230\u4E0B\u8F7D\u9875\u9762 iframe \u53C2\u6570",
        )
      let v = y[1],
        x = `${o}${v.startsWith("/") ? "" : "/"}${v}`,
        _ = await this.request(x, "GET", void 0, a),
        b = Ir(_)
      d = Gt(b, b)
      let S =
          b.match(/['"]?\/?ajaxm\.php\?file=(\d+)['"]?/) ||
          b.match(/file\s*[:=]\s*['"]?(\d+)['"]?/) ||
          b.match(/file=(\d+)/) ||
          b.match(/var\s+file_id\s*=\s*['"]?(\d+)['"]?/),
        A = S ? S[1] : ""
      if (!A) throw new Error("[Lanzou] \u672A\u627E\u5230\u6587\u4EF6 ID")
      let C = await this.request(`${o}/ajaxm.php?file=${A}`, "POST", d, x),
        P
      try {
        P = JSON.parse(C)
      } catch {
        throw new Error(
          `[Lanzou] ajaxm.php \u54CD\u5E94\u683C\u5F0F\u9519\u8BEF: ${C}`,
        )
      }
      if (P.zt !== 1)
        throw new Error(
          P.info ||
            P.text ||
            `[Lanzou] \u63D0\u53D6\u94FE\u63A5\u5931\u8D25 (zt=${P.zt})`,
        )
      ;((l = `${P.dom}/file`), (u = `${l}/${P.url}`))
      let k = c.match(
        /<title>(.+?) - 蓝奏云<\/title>|id="filenajax">(.+?)<\/div>|var filename = ['"](.+?)['"];|<div style="font-size[^>]*>([^<>]+)<\/div>|<div class="filethetext"[^>]*>([^<>]+)<\/div>/i,
      )
      if (k) {
        for (let D = 1; D < k.length; D++)
          if (k[D]) {
            f.name_all = k[D].trim()
            break
          }
      }
    }
    let h = c.match(/大小\W*([0-9.]+\s*[bkm]+)/i)
    h && (f.size = h[1])
    let m = c.match(/\d+\s*[秒天分小][钟时]?前|[昨前]天|\d{4}-\d{2}-\d{2}/)
    m && (f.time = m[0])
    let w = u,
      g = ""
    for (let y = 0; y < 3; y++) {
      let v = {
          Referer: l,
          "User-Agent": this.getUserAgent(),
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
        },
        x = "down_ip=1"
      ;(g && (x += `; acw_sc__v2=${g}`), (v.Cookie = x))
      let _ = await fetch(u, { method: "GET", headers: v, redirect: "manual" })
      if (
        _.status === 301 ||
        _.status === 302 ||
        _.status === 303 ||
        _.status === 307 ||
        _.status === 308
      ) {
        let S = _.headers.get("location")
        if (S) {
          w = new URL(S, u).toString()
          break
        }
      }
      if (_.status === 200 && _.url && _.url !== u) {
        w = _.url
        break
      }
      let b = await _.text()
      if (b.includes("acw_sc__v2")) {
        g = vs(b)
        continue
      }
      try {
        let S = Gt(b, b)
        ;((S.el = "2"), await new Promise((P) => setTimeout(P, 1500)))
        let A = await this.request(`${l}/ajax.php`, "POST", S, l),
          C = JSON.parse(A)
        if (C.url) {
          w = C.url.startsWith("http") ? C.url : new URL(C.url, l).toString()
          break
        }
      } catch {}
      break
    }
    return ((f.url = w), f)
  }
  async getFileRealInfo(e) {
    try {
      let t = await fetch(e, {
          method: "HEAD",
          headers: { "User-Agent": this.getUserAgent() },
        }),
        i = t.headers.get("content-length"),
        s = t.headers.get("last-modified")
      return {
        size: i ? parseInt(i, 10) : void 0,
        time: s ? new Date(s).toISOString() : void 0,
      }
    } catch {
      return {}
    }
  }
  async mkdir(e, t) {
    await this.doupload({
      task: "2",
      parent_id: e || "-1",
      folder_name: t,
      folder_description: "",
    })
  }
  async rename(e, t) {
    await this.doupload({ task: "46", file_id: e, file_name: t, type: "2" })
  }
  async move(e, t) {
    await this.doupload({ task: "20", file_id: e, folder_id: t })
  }
  async remove(e, t) {
    t
      ? await this.doupload({ task: "3", folder_id: e })
      : await this.doupload({ task: "6", file_id: e })
  }
}
function Kp(r) {
  let e = { ...(r || {}) }
  return (
    (e.type = e.type || "cookie"),
    (e.account = e.account || ""),
    (e.password = e.password || ""),
    (e.cookie = (e.cookie || "").trim()),
    (e.root_folder_id = e.root_folder_id || (e.type === "url" ? "" : "-1")),
    (e.share_password = e.share_password || ""),
    (e.baseUrl = e.baseUrl || "https://pc.woozooo.com"),
    (e.shareUrl = e.shareUrl || "https://pan.lanzoui.com"),
    (e.user_agent =
      e.user_agent ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"),
    (e.repair_file_info = !!e.repair_file_info),
    (e.order_by = e.order_by || "name"),
    (e.order_direction = e.order_direction || "asc"),
    e
  )
}
function Kn(r, e) {
  let t = !!r.is_folder || !!r.fol_id,
    i = r.name_all || r.name || "",
    s = e?.size !== void 0 ? e.size : rl(r.size || "0"),
    n = e?.time ? e.time : tl(r.time || ""),
    o = r.fol_id || r.id || ""
  return {
    name: i,
    size: s,
    is_dir: t,
    modified: n,
    sign: o,
    type: L(i, t),
    thumb: "",
    raw_url: r.url || "",
  }
}
var ks = class {
  client
  addition
  pathIdCache = new Map()
  constructor(e, t) {
    ;((this.addition = Kp(e)), (this.client = new bs(this.addition, t)))
  }
  async init() {
    await this.client.init()
  }
  isUrlMode() {
    return this.addition.type === "url"
  }
  getRootId() {
    return this.addition.root_folder_id || (this.isUrlMode() ? "" : "-1")
  }
  async resolveFolderId(e) {
    let t = this.getRootId(),
      i =
        "/" +
        String(e || "")
          .split("/")
          .filter(Boolean)
          .join("/")
    if (i === "/" || i === `/${t}`) return t
    let s = i.split("/").filter(Boolean),
      n = 0,
      o = t,
      a = ""
    for (let c = 0; c < s.length; c++) {
      let d = "/" + s.slice(0, c + 1).join("/"),
        l = this.pathIdCache.get(d)
      if (l !== void 0) ((o = l), (n = c + 1), (a = d))
      else break
    }
    for (let c = n; c < s.length; c++) {
      let d = s[c],
        l = (() => {
          try {
            return decodeURIComponent(d)
          } catch {
            return d
          }
        })(),
        f = (
          this.isUrlMode()
            ? await this.client.getFileOrFolderByShareUrl(
                o,
                this.addition.share_password,
              )
            : await this.client.getFolders(o)
        ).find((p) => {
          if (!p.is_folder && !p.fol_id) return !1
          let h = p.name || p.name_all || "",
            m = p.fol_id || p.id || ""
          return h === d || h === l || m === d || m === l
        })
      if (!f) throw new Error(`[Lanzou] \u76EE\u5F55\u672A\u627E\u5230: ${d}`)
      ;((o = f.fol_id || f.id || ""),
        (a = "/" + s.slice(0, c + 1).join("/")),
        this.pathIdCache.set(a, o))
    }
    return o
  }
  async resolveItem(e) {
    let t =
        "/" +
        String(e || "")
          .split("/")
          .filter(Boolean)
          .join("/"),
      i = t.split("/").filter(Boolean)
    if (i.length === 0) throw new Error("[Lanzou] \u8DEF\u5F84\u65E0\u6548")
    let s = i[i.length - 1],
      n = (() => {
        try {
          return decodeURIComponent(s)
        } catch {
          return s
        }
      })(),
      o = "/" + i.slice(0, i.length - 1).join("/"),
      a = await this.resolveFolderId(o),
      d = (
        this.isUrlMode()
          ? await this.client.getFileOrFolderByShareUrl(
              a,
              this.addition.share_password,
            )
          : await this.client.getAllFiles(a)
      ).find((u) => {
        let f = u.name_all || u.name || "",
          p = u.fol_id || u.id || ""
        return f === s || f === n || p === s || p === n
      })
    if (!d)
      throw new Error(
        `[Lanzou] \u6587\u4EF6\u6216\u76EE\u5F55\u672A\u627E\u5230: ${s}`,
      )
    let l = !!(d.is_folder || d.fol_id)
    return (
      l && this.pathIdCache.set(t, d.fol_id || d.id || ""),
      { item: d, parentId: a, isDir: l }
    )
  }
  async list(e, t) {
    let i = await this.resolveFolderId(t),
      n = (
        this.isUrlMode()
          ? await this.client.getFileOrFolderByShareUrl(
              i,
              this.addition.share_password,
            )
          : await this.client.getAllFiles(i)
      ).map((o) => Kn(o))
    return G(
      n,
      this.addition.order_by === "name"
        ? "file_name"
        : this.addition.order_by === "size"
          ? "size"
          : "updated_at",
      this.addition.order_direction,
    )
  }
  async get(e, t) {
    let i = String(t || "")
      .split("/")
      .filter(Boolean)
    if (i.length === 0 || i[i.length - 1] === this.getRootId()) {
      let d = this.getRootId()
      return {
        name: d || "root",
        size: 0,
        is_dir: !0,
        modified: new Date().toISOString(),
        sign: d,
        type: 1,
        raw_url: "",
      }
    }
    let { item: s, isDir: n } = await this.resolveItem(t)
    if (n) return Kn(s)
    let o = s.url
    if (!o)
      try {
        if (this.isUrlMode()) {
          let d = await this.client.getFilesByShareUrl(
            s.id || "",
            s.pwd || this.addition.share_password || "",
          )
          ;((o = d.url),
            (s.name_all = d.name_all || s.name_all),
            (s.size = d.size || s.size))
        } else {
          let d = await this.client.getFileShareUrlById(s.id || ""),
            l = d?.f_id || d?.id,
            u = d?.is_newd
          if (l) {
            let f = await this.client.getFilesByShareUrl(
              l,
              d.pwd || "",
              void 0,
              u,
            )
            ;((o = f.url),
              f.name_all && (s.name_all = f.name_all),
              f.size && (s.size = f.size))
          }
        }
      } catch (d) {
        throw (
          console.error(
            `[Lanzou] \u89E3\u6790\u4E0B\u8F7D\u94FE\u63A5\u5931\u8D25 (${s.name_all || s.name}):`,
            d.message,
          ),
          new Error(
            `[Lanzou] \u83B7\u53D6\u4E0B\u8F7D\u76F4\u94FE\u5931\u8D25 (${s.name_all || s.name}): ${d.message}`,
          )
        )
      }
    if (!o)
      throw new Error(
        `[Lanzou] \u672A\u80FD\u83B7\u53D6\u5230\u4E0B\u8F7D\u76F4\u94FE (${s.name_all || s.name || t})`,
      )
    let a
    if (this.addition.repair_file_info && o)
      try {
        a = await this.client.getFileRealInfo(o)
      } catch {}
    let c = Kn(s, a)
    return (
      (c.raw_url = o || ""),
      (c.raw_url_headers = { "User-Agent": this.client.getUserAgent() }),
      c
    )
  }
  async mkdir(e, t) {
    if (this.isUrlMode())
      throw new Error(
        "[Lanzou] \u5206\u4EAB\u94FE\u63A5\u6A21\u5F0F\u4E0D\u652F\u6301\u65B0\u5EFA\u6587\u4EF6\u5939",
      )
    let i = String(t || "")
        .split("/")
        .filter(Boolean),
      s = i.pop() || "\u65B0\u6587\u4EF6\u5939",
      n = "/" + i.join("/"),
      o = await this.resolveFolderId(n)
    await this.client.mkdir(o, s)
  }
  async rename(e, t, i) {
    if (this.isUrlMode())
      throw new Error(
        "[Lanzou] \u5206\u4EAB\u94FE\u63A5\u6A21\u5F0F\u4E0D\u652F\u6301\u91CD\u547D\u540D",
      )
    let { item: s, isDir: n } = await this.resolveItem(t)
    if (n)
      throw new Error(
        "[Lanzou] \u84DD\u594F\u4E91\u4E0D\u652F\u6301\u91CD\u547D\u540D\u6587\u4EF6\u5939",
      )
    await this.client.rename(s.id || "", i)
  }
  async remove(e, t, i) {
    if (this.isUrlMode())
      throw new Error(
        "[Lanzou] \u5206\u4EAB\u94FE\u63A5\u6A21\u5F0F\u4E0D\u652F\u6301\u5220\u9664",
      )
    let { item: s, isDir: n } = await this.resolveItem(t)
    await this.client.remove(s.fol_id || s.id || "", n)
  }
  async move(e, t, i, s, n) {
    if (this.isUrlMode())
      throw new Error(
        "[Lanzou] \u5206\u4EAB\u94FE\u63A5\u6A21\u5F0F\u4E0D\u652F\u6301\u79FB\u52A8",
      )
    let { item: o, isDir: a } = await this.resolveItem(s)
    if (a)
      throw new Error(
        "[Lanzou] \u84DD\u594F\u4E91\u4E0D\u652F\u6301\u79FB\u52A8\u6587\u4EF6\u5939",
      )
    let c = String(t).split("/").filter(Boolean),
      d = await this.resolveFolderId("/" + c.join("/"))
    await this.client.move(o.id || "", d)
  }
  async copy() {
    throw new Error(
      "[Lanzou] \u84DD\u594F\u4E91\u4E0D\u652F\u6301\u76F4\u63A5\u590D\u5236\u6587\u4EF6",
    )
  }
  async put() {
    throw new Error(
      "[Lanzou] Cloudflare Worker \u73AF\u5883\u6682\u4E0D\u652F\u6301\u76F4\u63A5\u6D41\u5F0F\u5199\u5165\uFF0C\u8BF7\u4F7F\u7528\u7F51\u9875\u7AEF\u8FDB\u884C\u6587\u4EF6\u4E0A\u4F20",
    )
  }
}
fe()
var ye = lr(Dr(), 1)
function Wp(r) {
  let e = r.replace(/\s+/g, ""),
    t = atob(e),
    i = new Uint8Array(t.length)
  for (let s = 0; s < t.length; s++) i[s] = t.charCodeAt(s)
  return i
}
function Gp(r) {
  let e = ""
  for (let t = 0; t < r.length; t++) e += String.fromCharCode(r[t])
  return btoa(e)
}
function Vp(r) {
  return Array.from(r)
    .map((e) => e.toString(16).padStart(2, "0"))
    .join("")
}
function Wn(r) {
  let e = 0n
  for (let t = 0; t < r.length; t++) e = (e << 8n) | BigInt(r[t])
  return e
}
function Jp(r, e) {
  let t = new Uint8Array(e),
    i = r
  for (let s = e - 1; s >= 0; s--) ((t[s] = Number(i & 0xffn)), (i >>= 8n))
  return t
}
function Qp(r, e, t) {
  let i = 1n
  for (r = r % t; e > 0n; )
    (e % 2n === 1n && (i = (i * r) % t), (r = (r * r) % t), (e /= 2n))
  return i
}
function Xp(r) {
  let e = r
      .replace(/-----BEGIN[^-]+-----/g, "")
      .replace(/-----END[^-]+-----/g, "")
      .replace(/\s+/g, ""),
    t = Wp(e),
    i = 0
  function s() {
    let d = t[i++],
      l = t[i++]
    if (l & 128) {
      let f = l & 127
      l = 0
      for (let p = 0; p < f; p++) l = (l << 8) | t[i++]
    }
    return { tag: d, length: l, dataStart: i }
  }
  let n = []
  function o(d, l) {
    let u = d
    for (; u < l; ) {
      let f = t[u++],
        p = t[u++]
      if (p & 128) {
        let m = p & 127
        p = 0
        for (let w = 0; w < m; w++) p = (p << 8) | t[u++]
      }
      let h = u
      if (((u += p), f === 2)) {
        let m = t.subarray(h, h + p)
        ;(m[0] === 0 && m.length > 1 && (m = m.subarray(1)), n.push(m))
      } else
        f === 48 || (f & 32) !== 0
          ? o(h, h + p)
          : f === 3 && t[h] === 0 && o(h + 1, h + p)
    }
  }
  if ((o(0, t.length), n.length < 2))
    throw new Error(
      "Failed to parse RSA public key: insufficient integers found",
    )
  let a = n[0],
    c = n[1]
  if (a.length < c.length) {
    let d = a
    ;((a = c), (c = d))
  }
  return { n: Wn(a), e: Wn(c), keyLength: a.length }
}
function Ss(r, e, t = !1) {
  let { n: i, e: s, keyLength: n } = Xp(e),
    o = typeof r == "string" ? new TextEncoder().encode(r) : r
  if (o.length > n - 11)
    throw new Error(`Data too long for RSA key size: ${o.length} > ${n - 11}`)
  let a = n - o.length - 3,
    c = new Uint8Array(a),
    d = new Uint8Array(a * 2)
  crypto.getRandomValues(d)
  let l = 0
  for (let m = 0; m < a; m++) {
    let w = d[l++]
    for (; w === 0; )
      (l >= d.length && (crypto.getRandomValues(d), (l = 0)), (w = d[l++]))
    c[m] = w
  }
  let u = new Uint8Array(n)
  ;((u[0] = 0), (u[1] = 2), u.set(c, 2), (u[2 + a] = 0), u.set(o, 3 + a))
  let f = Wn(u),
    p = Qp(f, s, i),
    h = Jp(p, n)
  return t ? Vp(h) : Gp(h)
}
function nl(r, e) {
  let t =
      typeof e == "string"
        ? ye.default.enc.Utf8.parse(e.slice(0, 16))
        : ye.default.lib.WordArray.create(Array.from(e.slice(0, 16)), 16),
    i = ye.default.enc.Utf8.parse(r)
  return ye.default.AES.encrypt(i, t, {
    mode: ye.default.mode.ECB,
    padding: ye.default.pad.Pkcs7,
  }).ciphertext.toString(ye.default.enc.Hex)
}
function ol(r, e) {
  return ye.default.HmacSHA1(r, e).toString(ye.default.enc.Hex)
}
function al(r) {
  return typeof r == "string"
    ? ye.default.enc.Utf8.parse(r)
    : ye.default.lib.WordArray.create(r)
}
function Ps(r) {
  return ye.default.MD5(al(r)).toString(ye.default.enc.Hex)
}
function cl(r) {
  return ye.default.MD5(al(r)).toString(ye.default.enc.Base64)
}
function Gn(r = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx") {
  return r.replace(/[xy]/g, (e) => {
    let t = (Math.random() * 16) | 0
    return (e === "x" ? t : (t & 3) | 8).toString(16)
  })
}
function Vn() {
  return (
    "0." +
    Math.floor(Math.random() * 1e17)
      .toString()
      .padStart(17, "0")
  )
}
function Yp(r, e, t) {
  let i = r ? r.split(";").map((o) => o.trim()) : [],
    s = `${e}=${t}`,
    n = i.findIndex((o) => o.startsWith(`${e}=`))
  return (n !== -1 ? (i[n] = s) : i.push(s), i.filter(Boolean).join("; "))
}
function Zp(r, e) {
  if (!e) return r
  let t = r,
    i = e.split(/,(?=\s*[a-zA-Z0-9_\-]+=[^;]+)/)
  for (let s of i) {
    let n = s.split(";")[0].trim(),
      o = n.indexOf("=")
    if (o > 0) {
      let a = n.slice(0, o).trim(),
        c = n.slice(o + 1).trim()
      t = Yp(t, a, c)
    }
  }
  return t
}
function eh(r) {
  let e = r
  if (typeof e.getSetCookie == "function") {
    let i = e.getSetCookie()
    if (i.length > 0) return i
  }
  let t = r.get("set-cookie")
  return t ? [t] : []
}
function dl(r) {
  let e = r.replace(/("id"\s*:\s*)(-?\d{16,})(?=\s*[,}])/g, '$1"$2"')
  return JSON.parse(e)
}
var th = new Set(["cloud.189.cn", "open.e.189.cn"])
function Jn(r) {
  return r.protocol === "https:" && th.has(r.hostname)
}
function ll(r) {
  try {
    let e = new URL(r, "https://open.e.189.cn")
    return !!e.searchParams.get("lt") && !!e.searchParams.get("reqId")
  } catch {
    return !1
  }
}
function Qn(r) {
  try {
    let e = new URL(r, "https://open.e.189.cn")
    return (
      e.hostname === "cloud.189.cn" &&
      (e.pathname === "/web/main" || e.pathname === "/main.action")
    )
  } catch {
    return !1
  }
}
var As = class {
  addition
  cookie = ""
  cookieDirty = !1
  sessionKey = ""
  rsa = { pubKey: "", pkId: "", expire: 0 }
  constructor(e, t) {
    ;((this.addition = e), (this.cookie = (e.cookie || "").trim()))
  }
  getCookie() {
    return this.cookie
  }
  consumePendingCookie() {
    return this.cookieDirty ? ((this.cookieDirty = !1), this.cookie) : null
  }
  getRootId() {
    return this.addition.root_folder_id || "-11"
  }
  setSessionKey(e) {
    this.sessionKey = e
  }
  getDownloadHeaders() {
    let e = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: "https://cloud.189.cn/",
    }
    return (this.cookie && (e.Cookie = this.cookie), e)
  }
  async updateCookie(e) {
    let t = eh(e)
    if (t.length === 0) return
    let i = t.reduce((s, n) => Zp(s, n), this.cookie)
    i !== this.cookie && ((this.cookie = i), (this.cookieDirty = !0))
  }
  async followRedirectsWithCookies(e, t) {
    let i = e
    for (let s = 0; s <= 8; s++) {
      let n = new URL(i)
      if (!Jn(n))
        throw new Error(
          n.protocol !== "https:"
            ? `[189Cloud] \u767B\u5F55\u91CD\u5B9A\u5411\u5FC5\u987B\u4F7F\u7528 HTTPS: ${n.origin}`
            : `[189Cloud] \u4E0D\u53D7\u4FE1\u4EFB\u7684\u767B\u5F55\u91CD\u5B9A\u5411\u5730\u5740: ${n.origin}`,
        )
      let o = { ...t }
      ;(s > 0 && (o.Referer = i), this.cookie && (o.Cookie = this.cookie))
      let a = await fetch(i, { method: "GET", headers: o, redirect: "manual" })
      await this.updateCookie(a.headers)
      let c = a.headers.get("location")
      if (!(a.status >= 300 && a.status < 400) || !c) {
        let u = i
        if (a.url && a.url !== i) {
          let f = new URL(a.url, i)
          if (ll(f.toString()) || Qn(f.toString())) {
            if (!Jn(f))
              throw new Error(
                f.protocol !== "https:"
                  ? `[189Cloud] \u767B\u5F55\u91CD\u5B9A\u5411\u5FC5\u987B\u4F7F\u7528 HTTPS: ${f.origin}`
                  : `[189Cloud] \u4E0D\u53D7\u4FE1\u4EFB\u7684\u767B\u5F55\u91CD\u5B9A\u5411\u5730\u5740: ${f.origin}`,
              )
            u = f.toString()
          }
        }
        return { response: a, url: u }
      }
      if (s === 8)
        throw new Error(
          "[189Cloud] \u767B\u5F55\u91CD\u5B9A\u5411\u6B21\u6570\u8FC7\u591A",
        )
      let l = new URL(c, i)
      if (!Jn(l))
        throw new Error(
          l.protocol !== "https:"
            ? `[189Cloud] \u767B\u5F55\u91CD\u5B9A\u5411\u5FC5\u987B\u4F7F\u7528 HTTPS: ${l.origin}`
            : `[189Cloud] \u4E0D\u53D7\u4FE1\u4EFB\u7684\u767B\u5F55\u91CD\u5B9A\u5411\u5730\u5740: ${l.origin}`,
        )
      i = l.toString()
    }
    throw new Error("[189Cloud] \u767B\u5F55\u91CD\u5B9A\u5411\u5931\u8D25")
  }
  async resolveLoginUrl(e, t) {
    let i = e
    for (let s = 0; s < 3; s++) {
      let n = new URL(e)
      n.searchParams.set("noCache", Vn())
      let o = await this.followRedirectsWithCookies(n.toString(), t)
      if (((i = o.url), ll(o.url) || Qn(o.url))) return o.url
      s < 2 && (await new Promise((a) => setTimeout(a, 150 * (s + 1))))
    }
    return i
  }
  async login(e = {}) {
    if (this.cookie && !e.force) return
    let t =
        "https://cloud.189.cn/api/portal/loginUrl.action?redirectURL=https%3A%2F%2Fcloud.189.cn%2Fmain.action",
      i = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://cloud.189.cn/",
      }
    this.cookie && (i.Cookie = this.cookie)
    let s = await this.resolveLoginUrl(t, i)
    if (Qn(s)) return
    if (!this.addition.username || !this.addition.password) {
      if (this.cookie) return
      throw new Error(
        "[189Cloud] \u8D26\u53F7\u6216\u5BC6\u7801\u4E3A\u7A7A\uFF0C\u4E14\u672A\u63D0\u4F9B\u6709\u6548 Cookie",
      )
    }
    let n
    try {
      n = new URL(s, "https://open.e.189.cn")
    } catch {
      n = new URL("https://open.e.189.cn" + s)
    }
    let o = n.searchParams.get("lt") || "",
      a = n.searchParams.get("reqId") || "",
      c = n.searchParams.get("appId") || "cloud"
    if (!o || !a)
      throw new Error(
        "[189Cloud] \u767B\u5F55\u8DF3\u8F6C\u53C2\u6570\u4E0D\u5B8C\u6574\uFF0C\u672A\u83B7\u53D6\u5230 lt \u6216 reqId",
      )
    let d = () => {
        let _ = {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          lt: o,
          reqid: a,
          referer: s,
          origin: "https://open.e.189.cn",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json;charset=UTF-8",
        }
        return (this.cookie && (_.Cookie = this.cookie), _)
      },
      l = await fetch("https://open.e.189.cn/api/logbox/oauth2/appConf.do", {
        method: "POST",
        headers: d(),
        body: new URLSearchParams({ version: "2.0", appKey: c }),
      })
    await this.updateCookie(l.headers)
    let u = await l.json()
    if (u.result !== "0" || !u.data)
      throw new Error(
        `[189Cloud] \u83B7\u53D6 AppConf \u5931\u8D25: ${u.msg || JSON.stringify(u)}`,
      )
    let f = await fetch(
      "https://open.e.189.cn/api/logbox/config/encryptConf.do",
      { method: "POST", headers: d(), body: new URLSearchParams({ appId: c }) },
    )
    await this.updateCookie(f.headers)
    let p = await f.json()
    if (p.result !== 0 || !p.data?.pubKey)
      throw new Error(
        `[189Cloud] \u83B7\u53D6 EncryptConf \u5931\u8D25: ${JSON.stringify(p)}`,
      )
    let h = p.data.pre || "",
      m = p.data.pubKey,
      w = h + Ss(this.addition.username, m, !0),
      g = h + Ss(this.addition.password, m, !0),
      y = {
        version: "v2.0",
        apToken: "",
        appKey: c,
        accountType: u.data.accountType || "01",
        userName: w,
        epd: g,
        captchaType: "",
        validateCode: "",
        smsValidateCode: "",
        captchaToken: "",
        returnUrl: u.data.returnUrl || "https://cloud.189.cn/main.action",
        mailSuffix: u.data.mailSuffix || "@189.cn",
        dynamicCheck: "FALSE",
        clientType: String(u.data.clientType ?? "10010"),
        cb_SaveName: "3",
        isOauth2: String(u.data.isOauth2 ?? !1),
        state: "",
        paramId: u.data.paramId || "",
      },
      v = await fetch(
        "https://open.e.189.cn/api/logbox/oauth2/loginSubmit.do",
        { method: "POST", headers: { ...d() }, body: new URLSearchParams(y) },
      )
    await this.updateCookie(v.headers)
    let x = await v.json()
    if (x.result !== 0) {
      let _ = x.msg || "\u767B\u5F55\u5931\u8D25"
      throw _.includes("\u9A8C\u8BC1\u7801") ||
        _.includes("\u6ED1\u5757") ||
        _.includes("\u8BBE\u5907\u9501")
        ? new Error(
            `[189Cloud] \u767B\u5F55\u89E6\u53D1\u9A8C\u8BC1\u7801/\u8BBE\u5907\u4FDD\u62A4: ${_}\u3002\u8BF7\u5728\u6D4F\u89C8\u5668\u767B\u5F55\u540E\u590D\u5236 Cookie \u586B\u5165\u914D\u7F6E\u3002`,
          )
        : new Error(`[189Cloud] \u767B\u5F55\u5931\u8D25: ${_}`)
    }
    x.toUrl &&
      (await this.followRedirectsWithCookies(x.toUrl, {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      }))
  }
  async request(e, t = {}) {
    let i = t.method || "GET",
      s = t.retryOnInvalidSession !== !1,
      n = new URL(e)
    if ((n.searchParams.set("noCache", Vn()), t.params))
      for (let [f, p] of Object.entries(t.params))
        p !== void 0 && n.searchParams.set(f, p)
    let o = {
      Accept: "application/json;charset=UTF-8",
      Referer: "https://cloud.189.cn/",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    this.cookie && (o.Cookie = this.cookie)
    let a
    t.body &&
      ((o["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8"),
      (a = new URLSearchParams(t.body).toString()))
    let c = await fetch(n.toString(), { method: i, headers: o, body: a })
    await this.updateCookie(c.headers)
    let d = await c.text(),
      l
    try {
      l = dl(d)
    } catch {
      throw new Error(
        `[189Cloud] \u975E\u9884\u671F\u54CD\u5E94: ${d.slice(0, 200)}`,
      )
    }
    if (
      l.errorCode === "InvalidSessionKey" ||
      l.res_code === "InvalidSessionKey" ||
      String(l.res_code) === "1010"
    ) {
      if (s)
        return (
          await this.login({ force: !0 }),
          this.request(e, { ...t, retryOnInvalidSession: !1 })
        )
      throw new Error(
        l.errorMsg ||
          l.res_message ||
          "[189Cloud] \u767B\u5F55\u4F1A\u8BDD\u5DF2\u5931\u6548",
      )
    }
    if (l.errorCode)
      throw new Error(
        l.errorMsg || `[189Cloud] API \u9519\u8BEF: ${l.errorCode}`,
      )
    if (!c.ok)
      throw new Error(
        l.errorMsg ||
          l.res_message ||
          `[189Cloud] HTTP \u8BF7\u6C42\u5931\u8D25 (${c.status})`,
      )
    if (l.res_code !== void 0 && String(l.res_code) !== "0")
      throw new Error(
        l.res_message || `189 API \u9519\u8BEF (res_code: ${l.res_code})`,
      )
    return l
  }
  async getFilesPage(e, t, i) {
    let s = this.addition.order_by || "lastOpTime",
      n =
        (this.addition.order_direction || "desc") === "desc" ? "true" : "false",
      o = await this.request(
        "https://cloud.189.cn/api/open/file/listFiles.action",
        {
          method: "GET",
          params: {
            pageSize: i,
            pageNum: String(t),
            mediaType: "0",
            folderId: e || this.getRootId(),
            iconOption: "5",
            orderBy: s,
            descending: n,
          },
        },
      ),
      a = o.fileListAO?.count,
      c =
        typeof a == "number"
          ? a
          : typeof a == "string" && a.trim() !== ""
            ? Number(a)
            : NaN
    if (
      !o.fileListAO ||
      typeof o.fileListAO != "object" ||
      Array.isArray(o.fileListAO) ||
      !Number.isFinite(c) ||
      c < 0 ||
      !Array.isArray(o.fileListAO.fileList) ||
      !Array.isArray(o.fileListAO.folderList)
    )
      throw new Error(
        "[189Cloud] \u6587\u4EF6\u5217\u8868\u54CD\u5E94\u7F3A\u5C11\u6709\u6548\u7684 fileListAO \u6570\u7EC4\u5B57\u6BB5",
      )
    return o
  }
  async validateRoot(e) {
    await this.getFilesPage(e, 1, "1")
  }
  async getFiles(e, t) {
    let i = [],
      s = [],
      n = 1,
      o = "60"
    for (;;) {
      if (t?.budget) {
        if (t.budget.used >= t.budget.limit) {
          console.warn(
            "[189Cloud] Cloudflare Worker subrequest budget limit reached.",
          )
          break
        }
        t.budget.used++
      }
      let c = (await this.getFilesPage(e, n, o)).fileListAO
      if (Number(c.count) === 0) break
      let d = c.fileList || [],
        l = c.folderList || []
      if (
        (s.push(...l),
        i.push(...d),
        (t?.findName &&
          ((t.findIsDir && l.some((u) => u.name === t.findName)) ||
            (!t.findIsDir && d.some((u) => u.name === t.findName)))) ||
          d.length + l.length < parseInt(o, 10))
      )
        break
      n++
    }
    return { files: i, folders: s }
  }
  async getDownloadUrl(e) {
    let t = await this.request(
        "https://cloud.189.cn/api/portal/getFileInfo.action",
        { method: "GET", params: { fileId: e } },
      ),
      i = t.fileDownloadUrl || t.downloadUrl
    if (!i)
      throw new Error(
        `[189Cloud] \u83B7\u53D6\u6587\u4EF6\u4E0B\u8F7D\u5730\u5740\u5931\u8D25 (fileId: ${e})`,
      )
    let s = i.startsWith("//") ? "https:" + i : i
    s = s.replace(/^http:\/\//i, "https://")
    try {
      let n = await fetch(s, {
          method: "GET",
          headers: this.getDownloadHeaders(),
          redirect: "manual",
        }),
        o = n.headers.get("location")
      n.status === 302 && o && (s = o.replace(/^http:\/\//i, "https://"))
    } catch {}
    return s
  }
  async getSessionKey() {
    let e = await this.request(
        "https://cloud.189.cn/v2/getUserBriefInfo.action",
        { method: "GET" },
      ),
      t = String(e.sessionKey || "")
    if (!t)
      throw new Error(
        "[189Cloud] \u83B7\u53D6\u4E0A\u4F20 SessionKey \u5931\u8D25",
      )
    return t
  }
  async getResKey() {
    if (this.rsa.pubKey && this.rsa.pkId && this.rsa.expire > Date.now())
      return this.rsa
    let e = await this.request(
        "https://cloud.189.cn/api/security/generateRsaKey.action",
        { method: "GET" },
      ),
      t = String(e.pubKey || ""),
      i = String(e.pkId || "")
    if (!t || !i)
      throw new Error(
        "[189Cloud] \u83B7\u53D6\u4E0A\u4F20 RSA \u516C\u94A5\u5931\u8D25",
      )
    return (
      (this.rsa = {
        pubKey: t,
        pkId: i,
        expire: Number(e.expire) || Date.now() + 5 * 6e4,
      }),
      this.rsa
    )
  }
  async uploadRequest(e, t) {
    this.sessionKey || (this.sessionKey = await this.getSessionKey())
    let i = String(Date.now()),
      s = Gn(),
      n = Gn("xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx").slice(
        0,
        16 + Math.floor(Math.random() * 17),
      ),
      o = Object.keys(t)
        .sort()
        .map((m) => `${m}=${t[m]}`)
        .join("&"),
      a = nl(o, n.slice(0, 16)),
      c = ol(
        `SessionKey=${this.sessionKey}&Operate=GET&RequestURI=${e}&Date=${i}&params=${a}`,
        n,
      ),
      { pubKey: d, pkId: l } = await this.getResKey(),
      u = {
        accept: "application/json;charset=UTF-8",
        SessionKey: this.sessionKey,
        Signature: c,
        "X-Request-Date": i,
        "X-Request-ID": s,
        EncryptionText: Ss(n, d, !1),
        PkId: l,
      }
    this.cookie && (u.Cookie = this.cookie)
    let f = await fetch(`https://upload.cloud.189.cn${e}?params=${a}`, {
      method: "GET",
      headers: u,
    })
    await this.updateCookie(f.headers)
    let p = await f.text()
    if (!f.ok)
      throw new Error(
        `[189Cloud] \u4E0A\u4F20\u63A5\u53E3 HTTP ${f.status}: ${p.slice(0, 200)}`,
      )
    let h
    try {
      h = dl(p)
    } catch {
      throw new Error(
        `[189Cloud] \u4E0A\u4F20\u63A5\u53E3\u8FD4\u56DE\u65E0\u6548\u54CD\u5E94: ${p.slice(0, 200)}`,
      )
    }
    if (h.code !== "SUCCESS")
      throw new Error(
        h.msg ||
          h.message ||
          `[189Cloud] \u4E0A\u4F20\u63A5\u53E3\u5931\u8D25: ${e}`,
      )
    return h
  }
  async createMultiUpload(e, t, i, s) {
    let n = await this.getSessionKey()
    this.sessionKey = n
    let o = {
        parentFolderId: e,
        fileName: encodeURIComponent(t).replace(/%20/g, "+"),
        fileSize: String(i),
        sliceSize: String(10 * 1024 * 1024),
      },
      a
    try {
      a = await this.uploadRequest("/person/initMultiUpload", {
        ...o,
        fileMd5: s,
        sliceMd5: s,
      })
    } catch (d) {
      let l = String(d?.message || d)
      if (
        !/InfoSecurityErrorCode|file md5 is in black list|security check not pass/i.test(
          l,
        )
      )
        throw d
      a = await this.uploadRequest("/person/initMultiUpload", {
        ...o,
        lazyCheck: "1",
      })
    }
    let c = String(a.data?.uploadFileId || "")
    if (!c)
      throw new Error(
        "[189Cloud] \u521B\u5EFA\u4E0A\u4F20\u4F1A\u8BDD\u5931\u8D25\uFF1A\u7F3A\u5C11 uploadFileId",
      )
    return {
      uploadFileId: c,
      fileDataExists: String(a.data?.fileDataExists || "0") === "1",
      sessionKey: n,
    }
  }
  async getMultiUploadUrls(e, t, i) {
    let n = (
      await this.uploadRequest("/person/getMultiUploadUrls", {
        partInfo: `${t}-${cl(i)}`,
        uploadFileId: e,
      })
    ).uploadUrls?.[`partNumber_${t}`]
    if (!n?.requestURL)
      throw new Error(
        `[189Cloud] \u83B7\u53D6\u7B2C ${t} \u4E2A\u5206\u7247\u4E0A\u4F20\u5730\u5740\u5931\u8D25`,
      )
    return n
  }
  async commitMultiUpload(e, t, i) {
    await this.uploadRequest("/person/commitMultiUploadFile", {
      uploadFileId: e,
      fileMd5: t,
      sliceMd5: i,
      lazyCheck: "1",
      opertype: "3",
    })
  }
  async mkdir(e, t) {
    await this.request(
      "https://cloud.189.cn/api/open/file/createFolder.action",
      {
        method: "POST",
        body: { parentFolderId: e || this.getRootId(), folderName: t },
      },
    )
  }
  async rename(e, t, i) {
    let s = t
        ? "https://cloud.189.cn/api/open/file/renameFolder.action"
        : "https://cloud.189.cn/api/open/file/renameFile.action",
      n = t
        ? { folderId: e, destFolderName: i }
        : { fileId: e, destFileName: i }
    await this.request(s, { method: "POST", body: n })
  }
  async batchTask(e, t, i = "") {
    let s = t.map((n) => ({
      fileId: n.id,
      fileName: n.name,
      isFolder: n.isFolder ? 1 : 0,
    }))
    await this.request(
      "https://cloud.189.cn/api/open/batch/createBatchTask.action",
      {
        method: "POST",
        body: { type: e, targetFolderId: i, taskInfos: JSON.stringify(s) },
      },
    )
  }
  async move(e, t, i, s) {
    await this.batchTask("MOVE", [{ id: e, name: i, isFolder: t }], s)
  }
  async copy(e, t, i, s) {
    await this.batchTask("COPY", [{ id: e, name: i, isFolder: t }], s)
  }
  async remove(e, t, i) {
    await this.batchTask("DELETE", [{ id: e, name: i, isFolder: t }], "")
  }
  async getCapacityInfo() {
    return this.request(
      "https://cloud.189.cn/api/portal/getUserSizeInfo.action",
      { method: "GET" },
    )
  }
}
var rh = 45,
  ih = 10 * 1024 * 1024
function sh(r) {
  return Buffer.from(JSON.stringify(r), "utf8").toString("base64")
}
function ul(r) {
  try {
    let e = JSON.parse(Buffer.from(r, "base64").toString("utf8"))
    if (
      !e ||
      !e.uploadFileId ||
      !e.sessionKey ||
      !e.fileMd5 ||
      !Number.isInteger(e.partCount) ||
      e.partCount < 1 ||
      !Number.isInteger(e.chunkSize) ||
      e.chunkSize < 1
    )
      throw new Error("invalid upload session")
    return e
  } catch {
    throw new Error(
      "[189Cloud] \u4E0A\u4F20\u4F1A\u8BDD\u65E0\u6548\u6216\u5DF2\u635F\u574F",
    )
  }
}
function hl(r) {
  if (!r) return new Date().toISOString()
  try {
    let e = new Date(r)
    if (!isNaN(e.getTime())) return e.toISOString()
  } catch {}
  return new Date().toISOString()
}
function fl(r) {
  return {
    name: r.name,
    size: 0,
    is_dir: !0,
    modified: hl(r.lastOpTime),
    sign: String(r.id),
    type: 1,
    thumb: "",
    raw_url: "",
  }
}
function pl(r) {
  return {
    name: r.name,
    size: r.size || 0,
    is_dir: !1,
    modified: hl(r.lastOpTime),
    sign: String(r.id),
    type: L(r.name, !1),
    thumb: r.icon?.smallUrl || r.icon?.largeUrl || "",
    raw_url: "",
  }
}
function nh(r) {
  let e = { ...(r || {}) }
  return (
    (e.username = e.username || ""),
    (e.password = e.password || ""),
    (e.cookie = (e.cookie || "").trim()),
    (e.root_folder_id = e.root_folder_id || "-11"),
    (e.order_by = e.order_by || "lastOpTime"),
    (e.order_direction = e.order_direction || "desc"),
    e
  )
}
var Cs = class {
  client
  addition
  pathIdCache = new Map()
  budget = { used: 0, limit: rh }
  constructor(e, t) {
    ;((this.addition = nh(e)), (this.client = new As(this.addition, t)))
  }
  async init() {
    await this.client.login()
  }
  consumePendingCookie() {
    return this.client.consumePendingCookie()
  }
  async resolveFolderId(e) {
    let t = this.client.getRootId(),
      i =
        "/" +
        String(e || "")
          .split("/")
          .filter(Boolean)
          .join("/")
    if (i === "/" || i === `/${t}`) return t
    let s = i.split("/").filter(Boolean),
      n = 0,
      o = t,
      a = ""
    for (let c = 0; c < s.length; c++) {
      let d = "/" + s.slice(0, c + 1).join("/"),
        l = this.pathIdCache.get(d)
      if (l !== void 0) ((o = l), (n = c + 1), (a = d))
      else break
    }
    for (let c = n; c < s.length; c++) {
      let d = s[c],
        l = (() => {
          try {
            return decodeURIComponent(d)
          } catch {
            return d
          }
        })(),
        { folders: u } = await this.client.getFiles(o, {
          findName: l,
          findIsDir: !0,
          budget: this.budget,
        }),
        f = u.find(
          (p) =>
            p.name === d ||
            p.name === l ||
            String(p.id) === d ||
            String(p.id) === l,
        )
      if (!f) throw new Error(`[189Cloud] \u76EE\u5F55\u672A\u627E\u5230: ${d}`)
      ;((o = String(f.id)),
        (a = "/" + s.slice(0, c + 1).join("/")),
        this.pathIdCache.set(a, o))
    }
    return o
  }
  async resolveFile(e) {
    let t = String(e || "")
      .split("/")
      .filter(Boolean)
    if (t.length === 0) throw new Error("[189Cloud] \u8DEF\u5F84\u65E0\u6548")
    let i = t[t.length - 1],
      s = (() => {
        try {
          return decodeURIComponent(i)
        } catch {
          return i
        }
      })(),
      n = "/" + t.slice(0, t.length - 1).join("/"),
      o = await this.resolveFolderId(n),
      { files: a, folders: c } = await this.client.getFiles(o, {
        findName: s,
        budget: this.budget,
      }),
      d = a.find(
        (u) =>
          u.name === i ||
          u.name === s ||
          String(u.id) === i ||
          String(u.id) === s,
      )
    if (d) return { file: d, parentId: o, isDir: !1 }
    let l = c.find(
      (u) =>
        u.name === i ||
        u.name === s ||
        String(u.id) === i ||
        String(u.id) === s,
    )
    if (l) return { file: l, parentId: o, isDir: !0 }
    throw new Error(
      `[189Cloud] \u6587\u4EF6\u6216\u76EE\u5F55\u672A\u627E\u5230: ${i}`,
    )
  }
  async list(e, t) {
    this.budget.used = 0
    let i = await this.resolveFolderId(t),
      { files: s, folders: n } = await this.client.getFiles(i, {
        budget: this.budget,
      }),
      o = [...n.map(fl), ...s.map(pl)]
    return G(
      o,
      this.addition.order_by === "filename"
        ? "file_name"
        : this.addition.order_by === "fileSize"
          ? "size"
          : "updated_at",
      this.addition.order_direction,
    )
  }
  async get(e, t) {
    this.budget.used = 0
    let i = String(t || "")
      .split("/")
      .filter(Boolean)
    if (i.length === 0 || i[i.length - 1] === this.client.getRootId()) {
      let a = this.client.getRootId()
      return {
        name: a,
        size: 0,
        is_dir: !0,
        modified: new Date().toISOString(),
        sign: a,
        type: 1,
        raw_url: "",
      }
    }
    let { file: s, isDir: n } = await this.resolveFile(t)
    if (n) return fl(s)
    let o = pl(s)
    try {
      ;((o.raw_url = await this.client.getDownloadUrl(String(s.id))),
        (o.raw_url_headers = this.client.getDownloadHeaders()))
    } catch (a) {
      console.warn(
        `[189Cloud] \u83B7\u53D6 ${s.name} \u4E0B\u8F7D\u5730\u5740\u5931\u8D25:`,
        a.message,
      )
    }
    return o
  }
  async mkdir(e, t) {
    this.budget.used = 0
    let i = String(t || "")
        .split("/")
        .filter(Boolean),
      s = i.pop() || "\u65B0\u6587\u4EF6\u5939",
      n = "/" + i.join("/"),
      o = await this.resolveFolderId(n)
    await this.client.mkdir(o, s)
  }
  async rename(e, t, i) {
    this.budget.used = 0
    let { file: s, isDir: n } = await this.resolveFile(t)
    await this.client.rename(String(s.id), n, i)
  }
  async remove(e, t, i) {
    this.budget.used = 0
    let { file: s, isDir: n } = await this.resolveFile(t)
    await this.client.remove(String(s.id), n, s.name)
  }
  async move(e, t, i, s, n) {
    this.budget.used = 0
    let { file: o, isDir: a } = await this.resolveFile(s),
      c = String(t).split("/").filter(Boolean),
      d = await this.resolveFolderId("/" + c.join("/"))
    await this.client.move(String(o.id), a, o.name, d)
  }
  async copy(e, t, i, s, n) {
    this.budget.used = 0
    let { file: o, isDir: a } = await this.resolveFile(s),
      c = String(t).split("/").filter(Boolean),
      d = await this.resolveFolderId("/" + c.join("/"))
    await this.client.copy(String(o.id), a, o.name, d)
  }
  async put(e, t, i) {
    let s = String(t || "")
        .split("/")
        .filter(Boolean),
      n = s.pop()
    if (!n) throw new Error("[189Cloud] \u4E0A\u4F20\u8DEF\u5F84\u65E0\u6548")
    let o = "/" + s.join("/"),
      a = await this.createUploadSession(o, o, n, i.length, Ps(i))
    if (a.reuse) return
    let c = []
    for (let d = 1; d <= a.partCount; d++) {
      let l = (d - 1) * a.chunkSize,
        u = i.subarray(l, Math.min(l + a.chunkSize, i.length)),
        f = await this.uploadPart(a.session, d, u)
      c.push(f.partMd5)
    }
    await this.completeUploadSession(a.session, c)
  }
  async createUploadSession(e, t, i, s, n) {
    let o = ih,
      a = String(n || "")
        .trim()
        .toLowerCase()
    if (!/^[a-f0-9]{32}$/.test(a))
      return {
        reuse: !1,
        requiresMd5: !0,
        partCount: 0,
        chunkSize: o,
        session: "",
      }
    this.budget.used = 0
    let c = Math.max(1, Math.ceil(Math.max(0, Number(s) || 0) / o)),
      d = await this.resolveFolderId(t || "/"),
      l = await this.client.createMultiUpload(
        d,
        i,
        Math.max(0, Number(s) || 0),
        a,
      )
    return l.fileDataExists
      ? (await this.client.commitMultiUpload(l.uploadFileId, a, a),
        { reuse: !0, partCount: 0, chunkSize: o, session: "" })
      : {
          reuse: !1,
          partCount: c,
          chunkSize: o,
          session: sh({
            uploadFileId: l.uploadFileId,
            sessionKey: l.sessionKey,
            fileMd5: a,
            size: Math.max(0, Number(s) || 0),
            partCount: c,
            chunkSize: o,
          }),
        }
  }
  async uploadPart(e, t, i) {
    let s = ul(e)
    if (!Number.isInteger(t) || t < 1 || t > s.partCount)
      throw new Error(`[189Cloud] \u5206\u7247\u5E8F\u53F7\u65E0\u6548: ${t}`)
    this.client.setSessionKey(s.sessionKey)
    let n = await this.client.getMultiUploadUrls(s.uploadFileId, t, i),
      o = {}
    if (n.requestHeader) {
      let c = n.requestHeader
      try {
        c = decodeURIComponent(c)
      } catch {}
      for (let d of c.split("&")) {
        let l = d.indexOf("=")
        l <= 0 || (o[d.slice(0, l)] = d.slice(l + 1))
      }
    }
    let a = await fetch(n.requestURL, { method: "PUT", headers: o, body: i })
    if (!a.ok) {
      let c = await a.text().catch(() => "")
      throw new Error(
        `[189Cloud] \u4E0A\u4F20\u7B2C ${t}/${s.partCount} \u5206\u7247\u5931\u8D25: HTTP ${a.status} ${c}`,
      )
    }
    return { partMd5: Ps(i) }
  }
  async completeUploadSession(e, t = []) {
    let i = ul(e)
    this.client.setSessionKey(i.sessionKey)
    let s = t
      .map((o) =>
        String(o || "")
          .trim()
          .toLowerCase(),
      )
      .filter((o) => /^[a-f0-9]{32}$/.test(o))
    if (s.length !== i.partCount)
      throw new Error(
        "[189Cloud] \u5206\u7247\u6821\u9A8C\u4FE1\u606F\u4E0D\u5B8C\u6574\uFF0C\u65E0\u6CD5\u63D0\u4EA4\u4E0A\u4F20",
      )
    let n =
      i.partCount === 1
        ? i.fileMd5
        : Ps(
            s.join(`
`),
          ).toUpperCase()
    await this.client.commitMultiUpload(i.uploadFileId, i.fileMd5, n)
  }
}
fe()
var Pt = lr(Dr(), 1)
function et(r, e) {
  let t = r.replace(/\/+$/, ""),
    i = e.replace(/^\/+/, "")
  return !t && !i ? "/" : t ? (i ? `${t}/${i}` : t) : "/" + i
}
function oh(r) {
  return r
    .split("/")
    .map((e) => encodeURIComponent(e))
    .join("/")
}
function gl(r, e) {
  let t = [],
    i,
    s =
      /<(?:[a-zA-Z0-9_-]+:)?response\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?response>/gi,
    n
  for (; (n = s.exec(r)) !== null; ) {
    let o = n[1],
      a =
        /<(?:[a-zA-Z0-9_-]+:)?href\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?href>/i.exec(
          o,
        )
    if (!a) continue
    let c = a[1].trim(),
      d = c
    try {
      d = decodeURIComponent(c)
    } catch {}
    let l =
        /<(?:[a-zA-Z0-9_-]+:)?propstat\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?propstat>/gi,
      u,
      f = ""
    for (; (u = l.exec(o)) !== null; ) {
      let E = u[1],
        O =
          /<(?:[a-zA-Z0-9_-]+:)?status\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?status>/i.exec(
            E,
          ),
        q = O ? O[1] : ""
      if (q.includes("200") || q.toLowerCase().includes("ok")) {
        let j =
          /<(?:[a-zA-Z0-9_-]+:)?prop\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?prop>/i.exec(
            E,
          )
        if (j) {
          f = j[1]
          break
        }
      }
    }
    if (!f) continue
    let p =
        /<(?:[a-zA-Z0-9_-]+:)?resourcetype\b[^>]*>[\s\S]*?<(?:[a-zA-Z0-9_-]+:)?collection\b/i.test(
          f,
        ),
      h =
        /<(?:[a-zA-Z0-9_-]+:)?displayname\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?displayname>/i.exec(
          f,
        ),
      m = h ? h[1].trim() : "",
      w = d.replace(/\/+$/, ""),
      g = (w && w.split("/").pop()) || "",
      y = m || g,
      v =
        /<(?:[a-zA-Z0-9_-]+:)?getcontentlength\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?getcontentlength>/i.exec(
          f,
        ),
      x = p ? 0 : (v && parseInt(v[1].trim(), 10)) || 0,
      _ =
        /<(?:[a-zA-Z0-9_-]+:)?getlastmodified\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?getlastmodified>/i.exec(
          f,
        ),
      b = new Date().toISOString()
    if (_) {
      let E = new Date(_[1].trim())
      isNaN(E.getTime()) || (b = E.toISOString())
    }
    let S =
        /<(?:[a-zA-Z0-9_-]+:)?getcontenttype\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?getcontenttype>/i.exec(
          f,
        ),
      A = S ? S[1].trim() : void 0,
      C =
        /<(?:[a-zA-Z0-9_-]+:)?getetag\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?getetag>/i.exec(
          f,
        ),
      P = C ? C[1].trim().replace(/^"|"$/g, "") : void 0,
      k = {
        name: y,
        path: d,
        size: x,
        modified: b,
        isFolder: p,
        contentType: A,
        etag: P,
      },
      D = e.replace(/\/+$/, "").toLowerCase(),
      T = w.toLowerCase()
    !i && (T === D || T.endsWith(D) || (D === "" && T === ""))
      ? (i = k)
      : t.push(k)
  }
  return { self: i, items: t }
}
function ah(r) {
  let e = {},
    t = r.replace(/^digest\s+/i, "").split(/,\s*/)
  for (let i of t) {
    let s = i.indexOf("=")
    if (s !== -1) {
      let n = i.slice(0, s).trim(),
        o = i
          .slice(s + 1)
          .trim()
          .replace(/^"|"$/g, "")
      n === "realm"
        ? (e.realm = o)
        : n === "nonce"
          ? (e.nonce = o)
          : n === "qop"
            ? (e.qop = o)
            : n === "opaque"
              ? (e.opaque = o)
              : n === "algorithm" && (e.algorithm = o)
    }
  }
  return e
}
function ml(r, e, t, i, s, n = 1) {
  let o = n.toString(16).padStart(8, "0"),
    a = Math.random().toString(36).substring(2, 18),
    c = r.realm || "",
    d = r.nonce || "",
    l = (r.algorithm || "MD5").toUpperCase(),
    u = r.qop || "",
    f = ""
  if (l === "MD5" || l === "") f = Pt.default.MD5(`${e}:${c}:${t}`).toString()
  else if (l === "MD5-SESS") {
    let w = Pt.default.MD5(`${e}:${c}:${t}`).toString()
    f = Pt.default.MD5(`${w}:${d}:${a}`).toString()
  }
  let p = ""
  ;(u === "auth" || u === "") && (p = Pt.default.MD5(`${i}:${s}`).toString())
  let h = ""
  u
    ? (h = Pt.default.MD5(`${f}:${d}:${o}:${a}:${u}:${p}`).toString())
    : (h = Pt.default.MD5(`${f}:${d}:${p}`).toString())
  let m = `Digest username="${e}", realm="${c}", nonce="${d}", uri="${s}", response="${h}"`
  return (
    l && (m += `, algorithm=${l}`),
    u && (m += `, qop=${u}, nc=${o}, cnonce="${a}"`),
    r.opaque && (m += `, opaque="${r.opaque}"`),
    m
  )
}
var ch = {
  com: "https://login.microsoftonline.com",
  cn: "https://login.chinacloudapi.cn",
  us: "https://login.microsoftonline.us",
  de: "https://login.microsoftonline.de",
}
async function dh(r, e, t) {
  let i = new URL(t),
    s = i.hostname.split("."),
    n = s[s.length - 1],
    a = `${ch[n] || "https://login.microsoftonline.com"}/extSTS.srf`,
    c = `<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
xmlns:a="http://www.w3.org/2005/08/addressing"
xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
<s:Header>
<a:Action s:mustUnderstand="1">http://schemas.xmlsoap.org/ws/2005/02/trust/RST/Issue</a:Action>
<a:ReplyTo>
<a:Address>http://www.w3.org/2005/08/addressing/anonymous</a:Address>
</a:ReplyTo>
<a:To s:mustUnderstand="1">${a}</a:To>
<o:Security s:mustUnderstand="1"
 xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
<o:UsernameToken>
  <o:Username>${r.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</o:Username>
  <o:Password>${e.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</o:Password>
</o:UsernameToken>
</o:Security>
</s:Header>
<s:Body>
<t:RequestSecurityToken xmlns:t="http://schemas.xmlsoap.org/ws/2005/02/trust">
<wsp:AppliesTo xmlns:wsp="http://schemas.xmlsoap.org/ws/2004/09/policy">
  <a:EndpointReference>
    <a:Address>${t.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</a:Address>
  </a:EndpointReference>
</wsp:AppliesTo>
<t:KeyType>http://schemas.xmlsoap.org/ws/2005/05/identity/NoProofKey</t:KeyType>
<t:RequestType>http://schemas.xmlsoap.org/ws/2005/02/trust/Issue</t:RequestType>
<t:TokenType>urn:oasis:names:tc:SAML:1.0:assertion</t:TokenType>
</t:RequestSecurityToken>
</s:Body>
</s:Envelope>`,
    d = await fetch(a, {
      method: "POST",
      headers: { "Content-Type": "application/soap+xml; charset=utf-8" },
      body: c,
    })
  if (!d.ok)
    throw new Error(`SharePoint SAML auth failed with HTTP ${d.status}`)
  let l = await d.text(),
    u =
      /<(?:[a-zA-Z0-9_-]+:)?BinarySecurityToken\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?BinarySecurityToken>/i.exec(
        l,
      )
  if (!u) {
    let y =
        /<(?:[a-zA-Z0-9_-]+:)?Text\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?Text>/i.exec(
          l,
        ),
      v = y ? y[1] : "Failed to obtain BinarySecurityToken"
    throw new Error(`SharePoint login failed: ${v}`)
  }
  let f = u[1].trim(),
    p = `https://${i.host}/_forms/default.aspx?wa=wsignin1.0`,
    h = await fetch(p, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: f,
      redirect: "manual",
    }),
    m = "",
    w = "",
    g = (y) => {
      let v = []
      if (y.headers.getSetCookie) v.push(...y.headers.getSetCookie())
      else {
        let x = y.headers.get("set-cookie")
        x && v.push(x)
      }
      for (let x of v) {
        let _ = /rtFa=([^;]+)/.exec(x)
        _ && (m = _[1])
        let b = /FedAuth=([^;]+)/.exec(x)
        b && (w = b[1])
      }
    }
  if ((g(h), !m || !w)) {
    let y = h.headers.get("location")
    if (y) {
      let v = new URL(y, p).toString(),
        x = await fetch(v, {
          method: "GET",
          headers: { Cookie: `rtFa=${m}; FedAuth=${w}` },
          redirect: "manual",
        })
      g(x)
    }
  }
  if (!m && !w)
    throw new Error(
      "SharePoint auth failed: rtFa / FedAuth cookies not returned",
    )
  return `rtFa=${m}; FedAuth=${w}`
}
var Es = class {
  address
  username
  password
  isSharepoint
  sharepointCookie = ""
  digestParts = null
  ncCount = 0
  constructor(e) {
    ;((this.address = e.address.replace(/\/+$/, "")),
      (this.username = e.username || ""),
      (this.password = e.password || ""),
      (this.isSharepoint = e.vendor === "sharepoint"))
  }
  async init() {
    this.isSharepoint &&
      (this.sharepointCookie = await dh(
        this.username,
        this.password,
        this.address,
      ))
  }
  buildUrl(e) {
    let t = e.replace(/^\/+/, "")
    return t ? `${this.address}/${oh(t)}` : this.address
  }
  getAuthHeaders(e, t) {
    let i = {}
    if (this.isSharepoint && this.sharepointCookie)
      i.Cookie = this.sharepointCookie
    else if (this.digestParts)
      (this.ncCount++,
        (i.Authorization = ml(
          this.digestParts,
          this.username,
          this.password,
          e,
          t,
          this.ncCount,
        )))
    else if (this.username || this.password) {
      let s = btoa(
        unescape(encodeURIComponent(`${this.username}:${this.password}`)),
      )
      i.Authorization = `Basic ${s}`
    }
    return i
  }
  async request(e, t, i = {}) {
    let s = this.buildUrl(t),
      n = new URL(s),
      o = n.pathname + n.search,
      c = { ...this.getAuthHeaders(e, o), ...(i.headers || {}) },
      d = await fetch(s, {
        method: e,
        headers: c,
        body: i.body,
        redirect: i.redirect || "follow",
      })
    if (d.status === 401 && !this.isSharepoint) {
      let l = d.headers.get("www-authenticate") || ""
      if (/digest/i.test(l)) {
        ;((this.digestParts = ah(l)), (this.ncCount = 1))
        let u = ml(
            this.digestParts,
            this.username,
            this.password,
            e,
            o,
            this.ncCount,
          ),
          f = { ...c, Authorization: u }
        d = await fetch(s, {
          method: e,
          headers: f,
          body: i.body,
          redirect: i.redirect || "follow",
        })
      }
    }
    return d
  }
  async readDir(e) {
    let i = await this.request("PROPFIND", e, {
      headers: {
        Depth: "1",
        "Content-Type": "application/xml; charset=utf-8",
        Accept: "application/xml, text/xml",
      },
      body: `<?xml version="1.0" encoding="utf-8" ?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:displayname/>
    <d:resourcetype/>
    <d:getcontentlength/>
    <d:getcontenttype/>
    <d:getetag/>
    <d:getlastmodified/>
  </d:prop>
</d:propfind>`,
    })
    if (i.status === 404) throw new Error(`Directory not found: ${e}`)
    if (i.status !== 207 && !i.ok) {
      let o = await i.text()
      throw new Error(
        `WebDAV PROPFIND failed with status ${i.status}: ${o || i.statusText}`,
      )
    }
    let s = await i.text(),
      { items: n } = gl(s, e)
    return n
  }
  async stat(e) {
    let i = await this.request("PROPFIND", e, {
      headers: {
        Depth: "0",
        "Content-Type": "application/xml; charset=utf-8",
        Accept: "application/xml, text/xml",
      },
      body: `<?xml version="1.0" encoding="utf-8" ?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:displayname/>
    <d:resourcetype/>
    <d:getcontentlength/>
    <d:getcontenttype/>
    <d:getetag/>
    <d:getlastmodified/>
  </d:prop>
</d:propfind>`,
    })
    if (i.status === 404) throw new Error(`Object not found: ${e}`)
    if (i.status !== 207 && !i.ok) {
      let c = await i.text()
      throw new Error(
        `WebDAV PROPFIND failed with status ${i.status}: ${c || i.statusText}`,
      )
    }
    let s = await i.text(),
      { self: n, items: o } = gl(s, e),
      a = n || o[0]
    if (!a) throw new Error(`Object not found in PROPFIND response: ${e}`)
    return a
  }
  async mkdir(e) {
    let t = await this.request("MKCOL", e)
    if (!(t.status === 201 || t.status === 405))
      throw new Error(`WebDAV MKCOL failed with status ${t.status}`)
  }
  async mkdirAll(e) {
    let t = await this.request("MKCOL", e)
    if (!(t.status === 201 || t.status === 405)) {
      if (t.status === 409) {
        let i = e.split("/").filter(Boolean),
          s = ""
        for (let n of i) {
          s += "/" + n
          let o = await this.request("MKCOL", s)
          if (o.status !== 201 && o.status !== 405)
            throw new Error(
              `WebDAV MkdirAll failed at ${s} with status ${o.status}`,
            )
        }
        return
      }
      throw new Error(`WebDAV MkdirAll failed with status ${t.status}`)
    }
  }
  async move(e, t, i = !0) {
    let s = this.buildUrl(t),
      n = await this.request("MOVE", e, {
        headers: { Destination: s, Overwrite: i ? "T" : "F" },
      })
    if (!(n.status === 201 || n.status === 204)) {
      if (n.status === 409) {
        let o = t.substring(0, t.lastIndexOf("/"))
        if (o) return (await this.mkdirAll(o), this.move(e, t, i))
      }
      throw new Error(`WebDAV MOVE failed with status ${n.status}`)
    }
  }
  async copy(e, t, i = !0) {
    let s = this.buildUrl(t),
      n = await this.request("COPY", e, {
        headers: { Destination: s, Overwrite: i ? "T" : "F" },
      })
    if (!(n.status === 201 || n.status === 204)) {
      if (n.status === 409) {
        let o = t.substring(0, t.lastIndexOf("/"))
        if (o) return (await this.mkdirAll(o), this.copy(e, t, i))
      }
      throw new Error(`WebDAV COPY failed with status ${n.status}`)
    }
  }
  async remove(e) {
    let t = await this.request("DELETE", e)
    if (!(t.status === 200 || t.status === 204 || t.status === 404))
      throw new Error(`WebDAV DELETE failed with status ${t.status}`)
  }
  async put(e, t, i) {
    let s = {}
    i && (s["Content-Type"] = i)
    let n = await this.request("PUT", e, { headers: s, body: t })
    if (!(n.status === 200 || n.status === 201 || n.status === 204)) {
      if (n.status === 409) {
        let o = e.substring(0, e.lastIndexOf("/"))
        if (
          o &&
          (await this.mkdirAll(o),
          (n = await this.request("PUT", e, { headers: s, body: t })),
          n.status === 200 || n.status === 201 || n.status === 204)
        )
          return
      }
      throw new Error(`WebDAV PUT failed with status ${n.status}`)
    }
  }
  getLink(e) {
    let t = this.buildUrl(e),
      i = new URL(t),
      s = i.pathname + i.search,
      n = this.getAuthHeaders("GET", s)
    return { url: t, headers: n }
  }
}
function lh(r) {
  let e = { ...(r || {}) }
  return (
    (e.vendor = e.vendor || "other"),
    (e.address = (e.address || "").trim()),
    (e.username = (e.username || "").trim()),
    (e.password = e.password || ""),
    (e.root_folder_path = (e.root_folder_path || "/").trim()),
    e.root_folder_path.startsWith("/") ||
      (e.root_folder_path = "/" + e.root_folder_path),
    (e.tls_insecure_skip_verify = !!e.tls_insecure_skip_verify),
    (e.order_by = e.order_by || "name"),
    (e.order_direction = e.order_direction || "asc"),
    e
  )
}
var Ds = class {
  client
  addition
  constructor(e) {
    ;((this.addition = lh(e)), (this.client = new Es(this.addition)))
  }
  async init() {
    await this.client.init()
  }
  getRemotePath(e) {
    let t = this.addition.root_folder_path || "/"
    return et(t, e || "/")
  }
  fileItemFromWebdav(e, t) {
    let i = this.client.getLink(t)
    return {
      name: e.name,
      size: e.size,
      is_dir: e.isFolder,
      modified: e.modified,
      sign: e.path || t,
      type: L(e.name, e.isFolder),
      thumb: "",
      raw_url: e.isFolder ? void 0 : i.url,
      raw_url_headers: e.isFolder ? void 0 : i.headers,
    }
  }
  async list(e, t) {
    let i = this.getRemotePath(t),
      n = (await this.client.readDir(i)).map((o) => {
        let a = et(i, o.name)
        return this.fileItemFromWebdav(o, a)
      })
    return G(
      n,
      this.addition.order_by || "name",
      this.addition.order_direction || "asc",
    )
  }
  async get(e, t) {
    let i = this.getRemotePath(t),
      s = await this.client.stat(i)
    return this.fileItemFromWebdav(s, i)
  }
  async mkdir(e, t) {
    let i = this.getRemotePath(t)
    await this.client.mkdirAll(i)
  }
  async rename(e, t, i) {
    let s = this.getRemotePath(t),
      n = s.lastIndexOf("/"),
      o = n >= 0 ? s.substring(0, n) : "/",
      a = et(o, i)
    await this.client.move(s, a, !0)
  }
  async move(e, t, i, s, n) {
    let o = this.getRemotePath(s),
      a = this.getRemotePath(n)
    for (let c of i) {
      let d = et(o, c),
        l = et(a, c)
      await this.client.move(d, l, !0)
    }
  }
  async copy(e, t, i, s, n) {
    let o = this.getRemotePath(s),
      a = this.getRemotePath(n)
    for (let c of i) {
      let d = et(o, c),
        l = et(a, c)
      await this.client.copy(d, l, !0)
    }
  }
  async remove(e, t, i) {
    let s = this.getRemotePath(t)
    if (i && i.length > 0)
      for (let n of i) {
        let o = et(s, n)
        await this.client.remove(o)
      }
    else await this.client.remove(s)
  }
  async put(e, t, i) {
    let s = this.getRemotePath(t)
    await this.client.put(s, i)
  }
}
fe()
var Be = "1001000021",
  Fs = "XFmi9GS2hzk98jGX",
  yl = "10000001",
  wl = "https://panservice.mail.wo.cn",
  Xn = "https://tjupload.pan.wo.cn",
  Yn =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.37"
var pt = "api-user",
  Zn = "wohome",
  xl = "wocloud"
var _l = "AppQueryUser",
  vl = "AppRefreshToken"
var bl = "QueryCloudUsageInfo"
var kl = "ClassifyRule",
  Sl = "GetZoneInfo"
var Pl = "FamilyUserCurrentEncode",
  Al = "QueryAllFiles"
var Cl = "GetDownloadUrlV2"
var El = "CreateDirectory",
  Dl = "RenameFileOrDirectory",
  Fl = "MoveFile",
  Tl = "CopyFile",
  Il = "DeleteFile"
var Bl = "upload2C"
var eo = {
  name_asc: 1,
  name_desc: 2,
  size_asc: 3,
  size_desc: 4,
  time_asc: 5,
  time_desc: 6,
}
var ve = lr(Dr(), 1)
var uh = "wNSOYIB1k1DjY5lA",
  Ts = class {
    key = Fs
    iv = uh
    accessKey = ""
    constructor(e) {
      e && this.setAccessToken(e)
    }
    setAccessToken(e) {
      e && e.length >= 16
        ? (this.accessKey = e.slice(0, 16))
        : e && (this.accessKey = e)
    }
    encrypt(e, t) {
      let i = t === pt ? this.key : this.accessKey || this.key,
        s = ve.default.enc.Utf8.parse(i),
        n = ve.default.enc.Utf8.parse(this.iv)
      return ve.default.AES.encrypt(ve.default.enc.Utf8.parse(e), s, {
        iv: n,
        mode: ve.default.mode.CBC,
        padding: ve.default.pad.Pkcs7,
      }).toString()
    }
    decrypt(e, t) {
      let i = t === pt ? this.key : this.accessKey || this.key,
        s = ve.default.enc.Utf8.parse(i),
        n = ve.default.enc.Utf8.parse(this.iv)
      return ve.default.AES.decrypt(e, s, {
        iv: n,
        mode: ve.default.mode.CBC,
        padding: ve.default.pad.Pkcs7,
      }).toString(ve.default.enc.Utf8)
    }
    userEncrypt(e) {
      return this.encrypt(e, pt)
    }
    userDecrypt(e) {
      return this.decrypt(e, pt)
    }
    woHomeEncrypt(e) {
      return this.encrypt(e, "wohome")
    }
    woHomeDecrypt(e) {
      return this.decrypt(e, "wohome")
    }
    calHeader(e, t) {
      let i = Date.now(),
        s = Math.floor(Math.random() * 8999) + 1e5,
        n = "",
        o = ve.default.MD5(`${t}${i}${s}${e}${n}`).toString()
      return { key: t, resTime: i, reqSeq: s, channel: e, sign: o, version: n }
    }
  }
function fh(r) {
  let e = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    t = ""
  for (let i = 0; i < r; i++)
    t += e.charAt(Math.floor(Math.random() * e.length))
  return t
}
function ph(r = new Date()) {
  let e = (c) => String(c).padStart(2, "0"),
    t = r.getFullYear(),
    i = e(r.getMonth() + 1),
    s = e(r.getDate()),
    n = e(r.getHours()),
    o = e(r.getMinutes()),
    a = e(r.getSeconds())
  return `${t}${i}${s}${n}${o}${a}`
}
var Is = class {
  addition
  accessToken
  refreshTokenValue
  phone = ""
  zoneURL = ""
  classifyRuleData = null
  crypto
  onTokenUpdate
  constructor(e, t) {
    ;((this.addition = e),
      (this.accessToken = e.access_token || ""),
      (this.refreshTokenValue = e.refresh_token || ""),
      (this.onTokenUpdate = t),
      (this.crypto = new Ts(this.accessToken)))
  }
  getAccessToken() {
    return this.accessToken
  }
  getRefreshToken() {
    return this.refreshTokenValue
  }
  setAccessToken(e) {
    ;((this.accessToken = e), this.crypto.setAccessToken(e))
  }
  setRefreshToken(e) {
    this.refreshTokenValue = e
  }
  async request(e, t, i, s = {}, n = !0) {
    let o = this.crypto.calHeader(e, t),
      a = { ...s }
    if (i != null) {
      let h = JSON.stringify(i),
        m = this.crypto.encrypt(h, e)
      a.param = m
    }
    let c = {
      Origin: "https://pan.wo.cn",
      Referer: "https://pan.wo.cn/",
      "User-Agent": Yn,
      "Content-Type": "application/json;charset=UTF-8",
    }
    this.accessToken && (c.Accesstoken = this.accessToken)
    let d = `${wl}/${e}/dispatcher`,
      l = await fetch(d, {
        method: "POST",
        headers: c,
        body: JSON.stringify({ header: o, body: a }),
      })
    if (!l.ok)
      throw new Error(
        `[WoPan] Request failed with HTTP status: ${l.status} ${l.statusText}`,
      )
    let u = await l.json().catch(() => null)
    if (!u) throw new Error(`[WoPan] Response is not valid JSON from ${t}`)
    if (u.STATUS !== "200")
      throw new Error(
        `[WoPan] Request failed with status: ${u.STATUS}, msg: ${u.MSG || ""}`,
      )
    let f = u.RSP?.RSP_CODE
    if (f !== "0000") {
      if (e !== pt && n && f === "9999")
        return (await this.refreshToken(), this.request(e, t, i, s, !1))
      throw new Error(
        `[WoPan] Request failed with rsp_code: ${f}, rsp_desc: ${u.RSP?.RSP_DESC || ""}`,
      )
    }
    let p = u.RSP?.DATA
    if (p == null) return {}
    if (typeof p == "string") {
      let h = p.trim()
      h.startsWith('"') && h.endsWith('"') && (h = h.slice(1, -1))
      try {
        let m = this.crypto.decrypt(h, e)
        if (m) return JSON.parse(m)
      } catch {
        try {
          return JSON.parse(h)
        } catch {
          return h
        }
      }
    }
    return p
  }
  async requestApiUser(e, t, i = {}) {
    return this.request(pt, e, t, i)
  }
  async requestWoHome(e, t, i = {}) {
    return this.request(Zn, e, t, i)
  }
  async appRefreshToken() {
    return await this.requestApiUser(
      vl,
      { refreshToken: this.refreshTokenValue, clientSecret: Fs },
      { clientId: Be, secret: !0 },
    )
  }
  async refreshToken() {
    let e = await this.appRefreshToken()
    if (!e.access_token)
      throw new Error("[WoPan] Failed to refresh token: empty access_token")
    ;(this.setAccessToken(e.access_token),
      e.refresh_token && this.setRefreshToken(e.refresh_token),
      this.onTokenUpdate?.(this.accessToken, this.refreshTokenValue))
  }
  async appQueryUser() {
    return this.requestApiUser(
      _l,
      { accessToken: this.accessToken },
      { clientId: Be, secret: !0 },
    )
  }
  async initPhone() {
    if (this.phone) return
    let e = await this.appQueryUser()
    e?.userId && (this.phone = e.userId)
  }
  async classifyRule() {
    return this.requestWoHome(kl, {}, { key: !0 })
  }
  async initClassifyRule() {
    if (this.classifyRuleData) return
    let e = await this.classifyRule().catch(() => null)
    e && (this.classifyRuleData = e)
  }
  async getZoneInfo() {
    return this.requestWoHome(Sl, { appId: yl }, { key: !0 })
  }
  async initZoneURL() {
    if (this.zoneURL) return
    let e = await this.getZoneInfo().catch(() => null)
    this.zoneURL = e?.url || Xn
  }
  async familyUserCurrentEncode() {
    return this.requestWoHome(Pl, { clientId: Be }, { secret: !0 })
  }
  async initData() {
    ;(!this.accessToken &&
      this.refreshTokenValue &&
      (await this.refreshToken()),
      await this.initPhone().catch(() => {}),
      await this.initClassifyRule().catch(() => {}),
      await this.initZoneURL().catch(() => {}))
  }
  getFileType(e) {
    let t = (e.split(".").pop() || "").toLowerCase()
    return t && this.classifyRuleData?.fileTypes?.[t]
      ? this.classifyRuleData.fileTypes[t].type
      : "5"
  }
  async queryAllFiles(e, t, i, s, n, o = "") {
    let a = {
      spaceType: e,
      parentDirectoryId: t,
      pageNum: i,
      pageSize: s,
      sortRule: n,
      clientId: Be,
    }
    return (
      e === "1" && o && (a.familyId = o),
      this.requestWoHome(Al, a, { secret: !0 })
    )
  }
  async getDownloadUrlV2(e) {
    let t = { type: "1", fidList: e, clientId: Be }
    return this.requestWoHome(Cl, t, { secret: !0 })
  }
  async createDirectory(e, t, i, s = "") {
    let n = {
      spaceType: e,
      familyId: s,
      parentDirectoryId: t,
      directoryName: i,
      clientId: Be,
    }
    return this.requestWoHome(El, n, { secret: !0 })
  }
  async renameFileOrDirectory(e, t, i, s, n = "") {
    let o = t === 0 ? "0" : this.getFileType(s),
      a = { spaceType: e, type: t, fileType: o, id: i, name: s, clientId: Be }
    ;(e === "1" && n && (a.familyId = n),
      await this.requestWoHome(Dl, a, { secret: !0 }))
  }
  async moveFile(e, t, i, s, n, o = "", a = "") {
    let c = {
      targetDirId: i,
      sourceType: s,
      targetType: n,
      dirList: e,
      fileList: t,
      secret: !1,
      clientId: Be,
    }
    ;(s === "1" && o && (c.fromFamilyId = o),
      n === "1" && a && (c.familyId = a),
      await this.requestWoHome(Fl, c, { secret: !0 }))
  }
  async copyFile(e, t, i, s, n, o = "", a = "") {
    let c = {
      targetDirId: i,
      sourceType: s,
      targetType: n,
      dirList: e,
      fileList: t,
      secret: !1,
      clientId: Be,
    }
    ;(s === "1" && o && (c.fromFamilyId = o),
      n === "1" && a && (c.familyId = a),
      await this.requestWoHome(Tl, c, { secret: !0 }))
  }
  async deleteFile(e, t, i) {
    let s = {
      spaceType: e,
      vipLevel: "0",
      dirList: t,
      fileList: i,
      clientId: Be,
    }
    await this.requestWoHome(Il, s, { secret: !0 })
  }
  async queryCloudUsageInfo() {
    return (
      await this.initPhone(),
      this.requestWoHome(
        bl,
        { phoneNum: this.phone, clientId: Be },
        { secret: !0 },
      )
    )
  }
  async upload2C(e, t, i, s, n = "", o) {
    await this.initZoneURL()
    let c = `${this.zoneURL || Xn}/openapi/client/${Bl}`,
      d =
        i instanceof Uint8Array
          ? i
          : i instanceof ArrayBuffer
            ? new Uint8Array(i)
            : new Uint8Array(i),
      l = d.length,
      u = Math.max(1, Math.ceil(l / 8388608)),
      f = ph(),
      p = {
        spaceType: e,
        directoryId: s,
        batchNo: f,
        fileName: t,
        fileSize: l,
        fileType: this.getFileType(t),
      }
    e === "1" && n && (p.familyId = n)
    let h = this.crypto.encrypt(JSON.stringify(p), Zn),
      m = `${Date.now()}_${fh(6)}`,
      w = 0,
      g = ""
    for (let y = 1; y <= u; y++) {
      let v = (y - 1) * 8388608,
        x = y === u ? l - v : 8388608,
        _ = d.subarray(v, v + x),
        b = new FormData()
      ;(b.append("uniqueId", m),
        b.append("accessToken", this.accessToken),
        b.append("fileName", t),
        b.append("psToken", "undefined"),
        b.append("fileSize", String(l)),
        b.append("totalPart", String(u)),
        b.append("channel", xl),
        b.append("directoryId", s),
        b.append("fileInfo", h),
        b.append("partSize", String(x)),
        b.append("partIndex", String(y)))
      let S = new Blob(
        [_.buffer.slice(_.byteOffset, _.byteOffset + _.byteLength)],
        { type: "application/octet-stream" },
      )
      b.append("file", S, t)
      let A = await fetch(c, {
        method: "POST",
        headers: {
          Origin: "https://pan.wo.cn",
          Referer: "https://pan.wo.cn/",
          "User-Agent": Yn,
        },
        body: b,
      })
      if (!A.ok)
        throw new Error(
          `[WoPan] Upload part ${y}/${u} failed with HTTP status: ${A.status}`,
        )
      let C = await A.json().catch(() => ({}))
      if (C.code !== "0000")
        throw new Error(
          `[WoPan] Upload part ${y}/${u} failed: ${C.code} ${C.msg || ""}`,
        )
      ;(C.data?.fid && (g = C.data.fid), (w += x), o?.(w, l))
    }
    return g
  }
}
function gh(r) {
  if (!r) return new Date().toISOString()
  if (r.length >= 14) {
    let e = r.slice(0, 4),
      t = r.slice(4, 6),
      i = r.slice(6, 8),
      s = r.slice(8, 10),
      n = r.slice(10, 12),
      o = r.slice(12, 14),
      a = `${e}-${t}-${i}T${s}:${n}:${o}+08:00`,
      c = new Date(a)
    if (!isNaN(c.getTime())) return c.toISOString()
  }
  try {
    let e = new Date(r)
    if (!isNaN(e.getTime())) return e.toISOString()
  } catch {}
  return new Date().toISOString()
}
function Rl(r) {
  let e = r.type === 0
  return {
    name: r.name,
    size: r.size || 0,
    is_dir: e,
    modified: gh(r.createTime),
    sign: r.fid || r.id,
    type: L(r.name, e),
    thumb: r.thumbUrl || "",
    raw_url: "",
  }
}
function ro(r) {
  let e = { ...(r || {}) }
  return (
    (e.root_folder_id = e.root_folder_id || "0"),
    (e.refresh_token = (e.refresh_token || "").trim()),
    (e.family_id = (e.family_id || "").trim()),
    (e.sort_rule = e.sort_rule || "name_asc"),
    (e.access_token = (e.access_token || "").trim()),
    e
  )
}
var Bs = class {
  client
  addition
  defaultFamilyId = ""
  pathFileMapCache = new Map()
  pathFolderIdCache = new Map()
  constructor(e, t) {
    ;((this.addition = ro(e)),
      (this.client = new Is(this.addition, (i, s) => {
        ;((this.addition.access_token = i),
          (this.addition.refresh_token = s),
          t?.(i, s))
      })))
  }
  getSpaceType() {
    return this.addition.family_id ? "1" : "0"
  }
  getFamilyId() {
    return this.addition.family_id || this.defaultFamilyId
  }
  getSortRuleNum() {
    let e = this.addition.sort_rule || "name_asc"
    return eo[e] || eo.name_asc
  }
  getRootId() {
    return this.addition.root_folder_id || "0"
  }
  async init() {
    await this.client.initData()
    let e = await this.client.familyUserCurrentEncode().catch(() => null)
    e?.defaultHomeId !== void 0 &&
      e.defaultHomeId !== null &&
      (this.defaultFamilyId = String(e.defaultHomeId))
  }
  async list(e, t) {
    let i = await this.resolveFolderId(t),
      s = await this.fetchFolderFiles(i),
      n = t.split("/").filter(Boolean).join("/")
    for (let a of s) {
      let c = n ? `${n}/${a.name}` : a.name
      ;(this.pathFileMapCache.set(c, a),
        a.type === 0 && this.pathFolderIdCache.set(c, a.id))
    }
    let o = s.map(Rl)
    return G(o, this.addition.order_by, this.addition.order_direction)
  }
  async get(e, t) {
    let i = t.split("/").filter(Boolean).join("/")
    if (!i)
      return {
        name: "root",
        size: 0,
        is_dir: !0,
        modified: new Date().toISOString(),
        sign: this.getRootId(),
        type: 1,
        raw_url: "",
      }
    let s = await this.resolveWoPanFile(t)
    if (!s) {
      let o = await this.resolveFolderId(t).catch(() => null)
      if (o) {
        let a = i.split("/")
        return {
          name: a[a.length - 1] || "root",
          size: 0,
          is_dir: !0,
          modified: new Date().toISOString(),
          sign: o,
          type: 1,
          raw_url: "",
        }
      }
      throw new Error(`[WoPan] File not found: ${t}`)
    }
    let n = Rl(s)
    if (!n.is_dir && s.fid) {
      let o = await this.client.getDownloadUrlV2([s.fid]).catch(() => null)
      o?.list?.[0]?.downloadUrl && (n.raw_url = o.list[0].downloadUrl)
    }
    return n
  }
  async mkdir(e, t) {
    let i = t.split("/").filter(Boolean),
      s = i.pop() || "\u65B0\u6587\u4EF6\u5939",
      n = i.join("/"),
      o = await this.resolveFolderId(n)
    ;(await this.client.createDirectory(
      this.getSpaceType(),
      o,
      s,
      this.getFamilyId(),
    ),
      this.clearCache())
  }
  async rename(e, t, i) {
    let s = await this.resolveWoPanFile(t)
    if (!s) throw new Error(`[WoPan] Item not found for rename: ${t}`)
    ;(await this.client.renameFileOrDirectory(
      this.getSpaceType(),
      s.type,
      s.id,
      i,
      this.getFamilyId(),
    ),
      this.clearCache())
  }
  async remove(e, t, i) {
    let s = await this.resolveWoPanFile(t)
    if (!s) throw new Error(`[WoPan] Item not found for deletion: ${t}`)
    let n = [],
      o = []
    ;(s.type === 0 ? n.push(s.id) : o.push(s.id),
      await this.client.deleteFile(this.getSpaceType(), n, o),
      this.clearCache())
  }
  async move(e, t, i, s, n) {
    let o = await this.resolveWoPanFile(s)
    if (!o) throw new Error(`[WoPan] Source item not found for move: ${s}`)
    let a = await this.resolveFolderId(t),
      c = [],
      d = []
    ;(o.type === 0 ? c.push(o.id) : d.push(o.id),
      await this.client.moveFile(
        c,
        d,
        a,
        this.getSpaceType(),
        this.getSpaceType(),
        this.getFamilyId(),
        this.getFamilyId(),
      ),
      this.clearCache())
  }
  async copy(e, t, i, s, n) {
    let o = await this.resolveWoPanFile(s)
    if (!o) throw new Error(`[WoPan] Source item not found for copy: ${s}`)
    let a = await this.resolveFolderId(t),
      c = [],
      d = []
    ;(o.type === 0 ? c.push(o.id) : d.push(o.id),
      await this.client.copyFile(
        c,
        d,
        a,
        this.getSpaceType(),
        this.getSpaceType(),
        this.getFamilyId(),
        this.getFamilyId(),
      ),
      this.clearCache())
  }
  async put(e, t, i) {
    let s = t.split("/").filter(Boolean),
      n = s.pop() || "upload",
      o = s.join("/"),
      a = await this.resolveFolderId(o)
    ;(await this.client.upload2C(
      this.getSpaceType(),
      n,
      i,
      a,
      this.getFamilyId(),
    ),
      this.clearCache())
  }
  clearCache() {
    ;(this.pathFileMapCache.clear(), this.pathFolderIdCache.clear())
  }
  async fetchFolderFiles(e) {
    let t = [],
      i = 0,
      s = 100
    for (;;) {
      let o =
        (
          await this.client.queryAllFiles(
            this.getSpaceType(),
            e,
            i,
            s,
            this.getSortRuleNum(),
            this.getFamilyId(),
          )
        )?.files || []
      if ((t.push(...o), o.length < s)) break
      i++
    }
    return t
  }
  async resolveFolderId(e) {
    let t = e.split("/").filter(Boolean).join("/")
    if (!t) return this.getRootId()
    if (this.pathFolderIdCache.has(t)) return this.pathFolderIdCache.get(t)
    let i = t.split("/"),
      s = this.getRootId()
    for (let n = 0; n < i.length; n++) {
      let o = i[n],
        a = (() => {
          try {
            return decodeURIComponent(o)
          } catch {
            return o
          }
        })(),
        c = i.slice(0, n + 1).join("/")
      if (this.pathFolderIdCache.has(c)) {
        s = this.pathFolderIdCache.get(c)
        continue
      }
      let d = await this.fetchFolderFiles(s)
      for (let u of d) {
        let f = i.slice(0, n).concat(u.name).join("/")
        ;(this.pathFileMapCache.set(f, u),
          u.type === 0 && this.pathFolderIdCache.set(f, u.id))
      }
      let l = d.find(
        (u) => u.type === 0 && (u.name === o || u.name === a || u.id === o),
      )
      if (!l)
        throw new Error(`[WoPan] Directory '${o}' not found in path '${e}'`)
      ;((s = l.id), this.pathFolderIdCache.set(c, s))
    }
    return s
  }
  async resolveWoPanFile(e) {
    let t = e.split("/").filter(Boolean).join("/")
    if (!t) return null
    if (this.pathFileMapCache.has(t)) return this.pathFileMapCache.get(t)
    let i = t.split("/"),
      s = i.pop(),
      n = (() => {
        try {
          return decodeURIComponent(s)
        } catch {
          return s
        }
      })(),
      o = i.join("/"),
      a = await this.resolveFolderId(o),
      c = await this.fetchFolderFiles(a)
    for (let l of c) {
      let u = i.concat(l.name).join("/")
      ;(this.pathFileMapCache.set(u, l),
        l.type === 0 && this.pathFolderIdCache.set(u, l.id))
    }
    return (
      c.find(
        (l) => l.name === s || l.name === n || l.id === s || l.fid === s,
      ) || null
    )
  }
}
fe()
var mh = new TextEncoder()
function Rr(r) {
  return typeof r == "string" ? mh.encode(r) : r
}
function so(r) {
  let e = r instanceof Uint8Array ? r : new Uint8Array(r),
    t = ""
  for (let i = 0; i < e.length; i++) t += e[i].toString(16).padStart(2, "0")
  return t
}
async function io(r) {
  let e = await crypto.subtle.digest("SHA-256", Rr(r))
  return so(e)
}
async function Br(r, e) {
  let t = await crypto.subtle.importKey(
      "raw",
      Rr(r),
      { name: "HMAC", hash: "SHA-256" },
      !1,
      ["sign"],
    ),
    i = await crypto.subtle.sign("HMAC", t, Rr(e))
  return new Uint8Array(i)
}
async function Ul(r, e) {
  let t = await Br(r, e)
  return so(t)
}
async function yh(r, e) {
  let t = await crypto.subtle.importKey(
      "raw",
      Rr(r),
      { name: "HMAC", hash: "SHA-1" },
      !1,
      ["sign"],
    ),
    i = await crypto.subtle.sign("HMAC", t, Rr(e))
  return so(i)
}
function rt(r, e = !0) {
  let t = encodeURIComponent(r).replace(
    /[!'()*]/g,
    (i) => "%" + i.charCodeAt(0).toString(16).toUpperCase(),
  )
  return (e || (t = t.replace(/%2F/g, "/")), t)
}
function ql(r = new Date()) {
  let e = (l) => l.toString().padStart(2, "0"),
    t = r.getUTCFullYear(),
    i = e(r.getUTCMonth() + 1),
    s = e(r.getUTCDate()),
    n = e(r.getUTCHours()),
    o = e(r.getUTCMinutes()),
    a = e(r.getUTCSeconds()),
    c = `${t}${i}${s}`
  return { amzDate: `${c}T${n}${o}${a}Z`, dateStamp: c }
}
async function Ol(r, e, t, i = "s3") {
  let s = "AWS4" + r,
    n = await Br(s, e),
    o = await Br(n, t),
    a = await Br(o, i)
  return await Br(a, "aws4_request")
}
async function $l(r) {
  let {
      method: e,
      url: t,
      region: i,
      accessKeyId: s,
      secretAccessKey: n,
      sessionToken: o,
      headers: a = {},
      body: c = null,
      service: d = "s3",
      date: l = new Date(),
    } = r,
    u = new URL(t),
    { amzDate: f, dateStamp: p } = ql(l),
    h =
      c != null
        ? await io(c)
        : "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    m = { ...a }
  ;((m.host = u.host),
    (m["x-amz-date"] = f),
    (m["x-amz-content-sha256"] = h),
    o && (m["x-amz-security-token"] = o))
  let w = Object.keys(m)
      .map((E) => E.toLowerCase())
      .sort(),
    g = ""
  for (let E of w) {
    let q = (Object.entries(m).find(([j]) => j.toLowerCase() === E)?.[1] || "")
      .trim()
      .replace(/\s+/g, " ")
    g += `${E}:${q}
`
  }
  let y = w.join(";"),
    v = u.pathname || "/",
    x = rt(v, !1),
    _ = []
  ;(u.searchParams.forEach((E, O) => {
    _.push([O, E])
  }),
    _.sort(([E], [O]) => (E < O ? -1 : E > O ? 1 : 0)))
  let b = _.map(([E, O]) => `${rt(E)}=${rt(O)}`).join("&"),
    S = [e.toUpperCase(), x, b, g, y, h].join(`
`),
    A = `${p}/${i}/${d}/aws4_request`,
    C = await io(S),
    P = ["AWS4-HMAC-SHA256", f, A, C].join(`
`),
    k = await Ol(n, p, i, d),
    D = await Ul(k, P),
    T = `AWS4-HMAC-SHA256 Credential=${s}/${A}, SignedHeaders=${y}, Signature=${D}`
  return ((m.authorization = T), { headers: m, url: u.toString() })
}
async function Rs(r) {
  let {
      method: e = "GET",
      url: t,
      region: i,
      accessKeyId: s,
      secretAccessKey: n,
      sessionToken: o,
      expiresInSeconds: a = 14400,
      service: c = "s3",
      date: d = new Date(),
      customQueryParams: l = {},
    } = r,
    u = new URL(t),
    { amzDate: f, dateStamp: p } = ql(d),
    h = `${p}/${i}/${c}/aws4_request`
  ;(u.searchParams.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256"),
    u.searchParams.set("X-Amz-Credential", `${s}/${h}`),
    u.searchParams.set("X-Amz-Date", f),
    u.searchParams.set("X-Amz-Expires", a.toString()),
    u.searchParams.set("X-Amz-SignedHeaders", "host"),
    o && u.searchParams.set("X-Amz-Security-Token", o))
  for (let [D, T] of Object.entries(l)) u.searchParams.set(D, T)
  let m = u.pathname || "/",
    w = rt(m, !1),
    g = []
  ;(u.searchParams.forEach((D, T) => {
    T.toLowerCase() !== "x-amz-signature" && g.push([T, D])
  }),
    g.sort(([D], [T]) => (D < T ? -1 : D > T ? 1 : 0)))
  let y = g.map(([D, T]) => `${rt(D)}=${rt(T)}`).join("&"),
    x = `host:${u.host}
`,
    S = [e.toUpperCase(), w, y, x, "host", "UNSIGNED-PAYLOAD"].join(`
`),
    A = await io(S),
    C = ["AWS4-HMAC-SHA256", f, h, A].join(`
`),
    P = await Ol(n, p, i, c),
    k = await Ul(P, C)
  return (u.searchParams.set("X-Amz-Signature", k), u.toString())
}
async function jl(r, e) {
  let t = "/auth/tmp_token.json",
    i = JSON.stringify({ channel: "OSS_FULL", scopes: ["*"] }),
    s =
      t +
      `
` +
      i,
    n = await yh(e, s),
    o = `TOKEN ${r}:${n}`,
    a = await fetch("https://api.dogecloud.com" + t, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: o },
      body: i,
    })
  if (!a.ok)
    throw new Error(`DogeCloud tmp_token request failed with HTTP ${a.status}`)
  let c = await a.json()
  if (c.code !== 200 || !c.data || !c.data.Credentials)
    throw new Error(
      `DogeCloud tmp_token error (${c.code}): ${c.msg || "unknown"}`,
    )
  return {
    accessKeyId: c.data.Credentials.accessKeyId,
    secretAccessKey: c.data.Credentials.secretAccessKey,
    sessionToken: c.data.Credentials.sessionToken,
    expiredAt: c.data.ExpiredAt,
  }
}
var wh = 5 * 1e3 * 1e3 * 1e3,
  xh = 100 * 1024 * 1024,
  _h = 5 * 1024 * 1024 * 1024,
  vh = 1e4
function oe(...r) {
  return r
    .map((e) => e.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/")
}
function je(r, e = !1) {
  let t = (r || "").replace(/^\/+/, "")
  return (t && e && !t.endsWith("/") && (t += "/"), t)
}
function Ur(r) {
  return r && r.trim() ? r.trim() : ".openlist"
}
function ht(r) {
  let e = r.replace(/\/+$/, ""),
    t = e.lastIndexOf("/")
  return t >= 0 ? e.substring(t + 1) : e
}
function no(r) {
  let e = r.replace(/\/+$/, ""),
    t = e.lastIndexOf("/")
  return t >= 0 ? e.substring(0, t) : ""
}
function zl(r, e) {
  let t = ("/" + r + "/").replace(/\/+/g, "/")
  return ("/" + e + "/").replace(/\/+/g, "/").startsWith(t)
}
function pe(r, e) {
  let t = r.match(new RegExp(`<${e}[^>]*>([\\s\\S]*?)<\\/${e}>`, "i"))
  return t ? t[1].trim() : void 0
}
function Us(r, e) {
  let t = [],
    i = new RegExp(`<${e}[^>]*>([\\s\\S]*?)<\\/${e}>`, "gi"),
    s
  for (; (s = i.exec(r)) !== null; ) t.push(s[1])
  return t
}
function At(r) {
  return r
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}
function it(r, e) {
  let t = pe(r, "Code") || "Unknown",
    i = pe(r, "Message") || r || `HTTP ${e}`,
    s = new Error(`S3 Error [${t}]: ${At(i)} (status ${e})`)
  return ((s.code = t), (s.status = e), s)
}
function bh(r, e, t, i = !1) {
  let s = [],
    n = Ur(t),
    o = Us(r, "CommonPrefixes")
  for (let l of o) {
    let u = pe(l, "Prefix")
    if (u) {
      let f = At(u),
        p = ht(f)
      p &&
        s.push({
          name: p,
          size: 0,
          isFolder: !0,
          modified: new Date().toISOString(),
          path: oe(e, p),
        })
    }
  }
  let a = Us(r, "Contents")
  for (let l of a) {
    let u = pe(l, "Key")
    if (!u) continue
    let f = At(u)
    if (f.endsWith("/")) continue
    let p = ht(f)
    if (!i && (p === n || p === t)) continue
    let h = parseInt(pe(l, "Size") || "0", 10),
      m = pe(l, "LastModified") || new Date().toISOString(),
      w = pe(l, "ETag")?.replace(/"/g, "")
    s.push({
      name: p,
      size: h,
      isFolder: !1,
      modified: m,
      path: oe(e, p),
      etag: w,
    })
  }
  let c = pe(r, "IsTruncated") === "true",
    d = pe(r, "NextMarker")
  return {
    files: s,
    isTruncated: c,
    nextMarker: d,
    lastEvaluatedKey: s.length > 0 ? s[s.length - 1].path : void 0,
  }
}
function kh(r, e, t, i = !1) {
  let s = [],
    n = Ur(t),
    o = Us(r, "CommonPrefixes")
  for (let l of o) {
    let u = pe(l, "Prefix")
    if (u) {
      let f = At(u),
        p = ht(f)
      p &&
        s.push({
          name: p,
          size: 0,
          isFolder: !0,
          modified: new Date().toISOString(),
          path: oe(e, p),
        })
    }
  }
  let a = Us(r, "Contents")
  for (let l of a) {
    let u = pe(l, "Key")
    if (!u) continue
    let f = At(u)
    if (f.endsWith("/")) continue
    let p = ht(f)
    if (!i && (p === n || p === t)) continue
    let h = parseInt(pe(l, "Size") || "0", 10),
      m = pe(l, "LastModified") || new Date().toISOString(),
      w = pe(l, "ETag")?.replace(/"/g, "")
    s.push({
      name: p,
      size: h,
      isFolder: !1,
      modified: m,
      path: oe(e, p),
      etag: w,
    })
  }
  let c = pe(r, "IsTruncated") === "true",
    d = pe(r, "NextContinuationToken")
  return {
    files: s,
    isTruncated: c,
    nextContinuationToken: d,
    lastEvaluatedKey: s.length > 0 ? s[s.length - 1].path : void 0,
  }
}
function Sh(r) {
  let e = pe(r, "UploadId")
  if (!e)
    throw new Error("InitiateMultipartUpload returned empty UploadId: " + r)
  return At(e)
}
function Ph(r) {
  let e = pe(r, "ETag")
  if (!e) throw new Error("UploadPartCopy returned empty ETag: " + r)
  return At(e).replace(/"/g, "")
}
function Ah(r) {
  let e = Math.max(xh, Math.floor((r - 1) / vh) + 1)
  if (e > _h) throw new Error(`Object size ${r} exceeds multipart copy limit`)
  return e
}
var qs = class {
  addition
  bucket
  endpoint
  region
  accessKeyId
  secretAccessKey
  sessionToken
  isPathStyle
  userAgent
  constructor(e) {
    ;((this.addition = e), (this.bucket = (e.bucket || "").trim()))
    let t = (e.endpoint || "").trim()
    ;(!t.startsWith("http://") &&
      !t.startsWith("https://") &&
      (t = "https://" + t),
      (this.endpoint = t.replace(/\/+$/, "")),
      (this.region = (e.region || "").trim() || "openlist"),
      (this.accessKeyId = (e.access_key_id || "").trim()),
      (this.secretAccessKey = (e.secret_access_key || "").trim()),
      (this.sessionToken = e.session_token ? e.session_token.trim() : void 0),
      (this.userAgent = e.user_agent ? e.user_agent.trim() : void 0))
    let i = new URL(this.endpoint),
      s =
        /^(\d{1,3}\.){3}\d{1,3}$/.test(i.hostname) || i.hostname === "localhost"
    this.isPathStyle = !!e.force_path_style || s
  }
  updateCredentials(e) {
    ;((this.accessKeyId = e.accessKeyId),
      (this.secretAccessKey = e.secretAccessKey),
      (this.sessionToken = e.sessionToken))
  }
  getUrl(e = "", t) {
    let i = new URL(this.endpoint),
      s = "",
      n = e ? je(e, !1) : ""
    if (this.isPathStyle) {
      let c = [i.pathname.replace(/\/+$/, ""), this.bucket, n]
        .filter(Boolean)
        .join("/")
      ;((i.pathname = "/" + c.replace(/^\/+/, "")), (s = i.toString()))
    } else {
      let a = i.host.split(":"),
        c = a[1] ? `:${a[1]}` : "",
        d = `${this.bucket}.${a[0]}${c}`
      i.host = d
      let u = [i.pathname.replace(/\/+$/, ""), n].filter(Boolean).join("/")
      ;((i.pathname = "/" + u.replace(/^\/+/, "")), (s = i.toString()))
    }
    let o = new URL(s)
    if (t)
      for (let [a, c] of Object.entries(t))
        c != null && o.searchParams.set(a, c)
    return o.toString()
  }
  async fetch(e, t, i = null, s = {}) {
    let n = { ...s }
    this.userAgent && (n["user-agent"] = this.userAgent)
    let { headers: o } = await $l({
        method: e,
        url: t,
        region: this.region,
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
        sessionToken: this.sessionToken,
        headers: n,
        body: i,
      }),
      a = { method: e, headers: o }
    return (
      i != null && e !== "GET" && e !== "HEAD" && (a.body = i),
      await fetch(t, a)
    )
  }
  async listObjects(e, t = "v1", i = !1) {
    let s = je(e, !0),
      n = [],
      o = this.addition.placeholder || ""
    if (t === "v2") {
      let a, c
      for (;;) {
        let d = { "list-type": "2", prefix: s, delimiter: "/" }
        ;(a && (d["continuation-token"] = a), c && (d["start-after"] = c))
        let l = this.getUrl("", d),
          u = await this.fetch("GET", l),
          f = await u.text()
        if (!u.ok) throw it(f, u.status)
        let p = kh(f, e, o, i)
        if ((n.push(...p.files), !p.isTruncated)) break
        if (p.nextContinuationToken) {
          a = p.nextContinuationToken
          continue
        }
        if (p.files.length === 0) break
        c = p.lastEvaluatedKey
      }
    } else {
      let a
      for (;;) {
        let c = { prefix: s, delimiter: "/" }
        a && (c.marker = a)
        let d = this.getUrl("", c),
          l = await this.fetch("GET", d),
          u = await l.text()
        if (!l.ok) throw it(u, l.status)
        let f = bh(u, e, o, i)
        if ((n.push(...f.files), !f.isTruncated)) break
        if (f.nextMarker) a = f.nextMarker
        else if (f.files.length > 0) a = f.files[f.files.length - 1].path
        else break
      }
    }
    return n
  }
  async headObject(e) {
    let t = this.getUrl(e),
      i = await this.fetch("HEAD", t)
    if (i.status === 404) return null
    if (!i.ok) {
      let a = await i.text().catch(() => "")
      throw it(a, i.status)
    }
    let s = parseInt(i.headers.get("content-length") || "0", 10),
      n = i.headers.get("last-modified") || new Date().toISOString(),
      o = (i.headers.get("etag") || "").replace(/"/g, "")
    return { size: s, modified: n, etag: o }
  }
  async listPrefixProbe(e, t = "v1") {
    let s = { prefix: je(e, !0), "max-keys": "1" }
    t === "v2" && (s["list-type"] = "2")
    let n = this.getUrl("", s),
      o = await this.fetch("GET", n)
    if (!o.ok) return !1
    let a = await o.text()
    return a.includes("<Contents>") || a.includes("<CommonPrefixes>")
  }
  async putObject(e, t, i = "application/octet-stream") {
    let s = this.getUrl(e),
      n = { "content-type": i },
      o = await this.fetch("PUT", s, t, n)
    if (!o.ok) {
      let a = await o.text().catch(() => "")
      throw it(a, o.status)
    }
  }
  async deleteObject(e) {
    let t = this.getUrl(e),
      i = await this.fetch("DELETE", t)
    if (!i.ok && i.status !== 404 && i.status !== 204) {
      let s = await i.text().catch(() => "")
      throw it(s, i.status)
    }
  }
  async copyObject(e, t, i) {
    if (i !== void 0 && i > wh) return this.copyMultipart(e, t, i)
    let s = je(e, !1),
      n = je(t, !1),
      o = rt(`${this.bucket}/${s}`, !1),
      a = this.getUrl(n),
      c = { "x-amz-copy-source": o },
      d = await this.fetch("PUT", a, null, c)
    if (!d.ok) {
      let l = await d.text().catch(() => "")
      throw it(l, d.status)
    }
  }
  async copyMultipart(e, t, i) {
    let s = je(e, !1),
      n = je(t, !1),
      o = rt(`${this.bucket}/${s}`, !1),
      a = this.getUrl(n, { uploads: "" }),
      c = await this.fetch("POST", a),
      d = await c.text()
    if (!c.ok) throw it(d, c.status)
    let l = Sh(d),
      u = Ah(i),
      f = []
    try {
      let p = 0,
        h = 1
      for (; p < i; ) {
        let y = Math.min(p + u, i) - 1,
          v = this.getUrl(n, { partNumber: h.toString(), uploadId: l }),
          x = {
            "x-amz-copy-source": o,
            "x-amz-copy-source-range": `bytes=${p}-${y}`,
          },
          _ = await this.fetch("PUT", v, null, x),
          b = await _.text()
        if (!_.ok) throw it(b, _.status)
        let S = Ph(b)
        ;(f.push({ partNumber: h, etag: S }), (p += u), h++)
      }
      let m = this.getUrl(n, { uploadId: l }),
        w = [
          "<CompleteMultipartUpload>",
          ...f.map(
            (y) =>
              `<Part><PartNumber>${y.partNumber}</PartNumber><ETag>${y.etag}</ETag></Part>`,
          ),
          "</CompleteMultipartUpload>",
        ].join(""),
        g = await this.fetch("POST", m, w, {
          "content-type": "application/xml",
        })
      if (!g.ok) {
        let y = await g.text().catch(() => "")
        throw it(y, g.status)
      }
    } catch (p) {
      let h = this.getUrl(n, { uploadId: l })
      throw (await this.fetch("DELETE", h).catch(() => {}), p)
    }
  }
  async getLink(e, t, i = 4, s = "", n = !1, o = !1, a = !1) {
    let c = je(e, !1),
      d = Math.max(60, Math.floor(i * 3600)),
      l = this.getUrl(c),
      u = {}
    if (!s) {
      let p = `attachment; filename*=UTF-8''${encodeURIComponent(t)}`
      ;(a &&
        (p = `attachment; filename="${encodeURIComponent(t)}"; filename*=UTF-8''${encodeURIComponent(t)}`),
        (u["response-content-disposition"] = p))
    }
    if (s)
      if (n) {
        let p = await Rs({
            url: l,
            region: this.region,
            accessKeyId: this.accessKeyId,
            secretAccessKey: this.secretAccessKey,
            sessionToken: this.sessionToken,
            expiresInSeconds: d,
            customQueryParams: u,
          }),
          h = new URL(p),
          m = s.split("://")
        if (
          (m.length === 2 && (m[0] === "http" || m[0] === "https")
            ? ((h.protocol = m[0] + ":"), (h.host = m[1].replace(/\/+$/, "")))
            : (h.host = s.replace(/\/+$/, "")),
          o)
        ) {
          let w = "/" + this.bucket
          if (h.pathname.startsWith(w)) {
            let g = h.pathname.substring(w.length)
            ;(g || (g = "/"), (h.pathname = g))
          }
        }
        return { url: h.toString() }
      } else {
        let p = s.split("://"),
          h = "https",
          m = s
        p.length === 2 &&
          (p[0] === "http" || p[0] === "https") &&
          ((h = p[0]), (m = p[1].replace(/\/+$/, "")))
        let w = this.isPathStyle ? `/${this.bucket}/${c}` : `/${c}`
        return (
          o &&
            w.startsWith(`/${this.bucket}`) &&
            ((w = w.substring(`/${this.bucket}`.length)), w || (w = "/")),
          { url: `${h}://${m}${w.startsWith("/") ? "" : "/"}${w}` }
        )
      }
    return {
      url: await Rs({
        url: l,
        region: this.region,
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
        sessionToken: this.sessionToken,
        expiresInSeconds: d,
        customQueryParams: u,
      }),
    }
  }
  async getDirectUploadInfo(e, t, i = 4, s = "") {
    let n = oe(e, t),
      o = je(n, !1),
      a = Math.max(60, Math.floor(i * 3600)),
      c = this.getUrl(o)
    if (s) {
      let l = new URL(c),
        u = s.split("://")
      ;(u.length === 2 && (u[0] === "http" || u[0] === "https")
        ? ((l.protocol = u[0] + ":"), (l.host = u[1].replace(/\/+$/, "")))
        : (l.host = s.replace(/\/+$/, "")),
        (c = l.toString()))
    }
    return {
      upload_url: await Rs({
        method: "PUT",
        url: c,
        region: this.region,
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
        sessionToken: this.sessionToken,
        expiresInSeconds: a,
      }),
      method: "PUT",
    }
  }
}
function Ch(r) {
  let e = { ...(r || {}) }
  return (
    (e.bucket = (e.bucket || "").trim()),
    (e.endpoint = (e.endpoint || "").trim()),
    (e.region = (e.region || "").trim() || "openlist"),
    (e.access_key_id = (e.access_key_id || "").trim()),
    (e.secret_access_key = (e.secret_access_key || "").trim()),
    (e.session_token = (e.session_token || "").trim()),
    (e.root_folder_path = (e.root_folder_path || "/").trim()),
    e.root_folder_path.startsWith("/") ||
      (e.root_folder_path = "/" + e.root_folder_path),
    (e.custom_host = (e.custom_host || "").trim()),
    (e.enable_custom_host_presign = !!e.enable_custom_host_presign),
    (e.sign_url_expire = Number(e.sign_url_expire) || 4),
    (e.placeholder = (e.placeholder || "").trim()),
    (e.force_path_style = !!e.force_path_style),
    (e.list_object_version = (e.list_object_version || "v1").toLowerCase()),
    (e.remove_bucket = !!e.remove_bucket),
    (e.add_filename_to_disposition = !!e.add_filename_to_disposition),
    (e.enable_direct_upload = !!e.enable_direct_upload),
    (e.direct_upload_host = (e.direct_upload_host || "").trim()),
    (e.user_agent = (e.user_agent || "").trim()),
    (e.order_by = e.order_by || "name"),
    (e.order_direction = e.order_direction || "asc"),
    e
  )
}
var Os = class {
  client
  addition
  driverName
  dogeExpiredAt
  dogeTimer
  constructor(e, t = "S3") {
    ;((this.addition = Ch(e)),
      (this.driverName = t),
      (this.client = new qs(this.addition)))
  }
  async init() {
    this.driverName.toLowerCase().includes("doge") &&
      (await this.refreshDogeToken())
  }
  async refreshDogeToken() {
    try {
      let e = await jl(
        this.addition.access_key_id,
        this.addition.secret_access_key,
      )
      ;((this.dogeExpiredAt = e.expiredAt),
        this.client.updateCredentials({
          accessKeyId: e.accessKeyId,
          secretAccessKey: e.secretAccessKey,
          sessionToken: e.sessionToken,
        }))
    } catch (e) {
      throw (
        console.error("[S3Driver] DogeCloud init/refresh session error:", e),
        e
      )
    }
  }
  async checkDogeToken() {
    if (this.driverName.toLowerCase().includes("doge")) {
      let e = Math.floor(Date.now() / 1e3)
      ;(!this.dogeExpiredAt || this.dogeExpiredAt - e < 120) &&
        (await this.refreshDogeToken())
    }
  }
  drop() {
    this.dogeTimer && (clearInterval(this.dogeTimer), (this.dogeTimer = void 0))
  }
  getRemotePath(e) {
    let t = this.addition.root_folder_path || "/",
      i = e || "/"
    return (t !== "/" && !zl(t, i) && (i = oe(t, i)), je(i, !1))
  }
  async fileItemFromS3(e, t) {
    let i, s
    if (!e.isFolder) {
      let n = await this.client.getLink(
        t,
        e.name,
        Number(this.addition.sign_url_expire) || 4,
        this.addition.custom_host,
        this.addition.enable_custom_host_presign,
        this.addition.remove_bucket,
        this.addition.add_filename_to_disposition,
      )
      ;((i = n.url), (s = n.headers))
    }
    return {
      name: e.name,
      size: e.size,
      is_dir: e.isFolder,
      modified: e.modified,
      sign: e.etag || t,
      type: L(e.name, e.isFolder),
      thumb: "",
      raw_url: i,
      raw_url_headers: s,
    }
  }
  async list(e, t) {
    await this.checkDogeToken()
    let i = this.getRemotePath(t),
      s = this.addition.list_object_version === "v2" ? "v2" : "v1",
      n = await this.client.listObjects(i, s, !1),
      o = []
    for (let a of n) {
      let c = oe(i, a.name),
        d = await this.fileItemFromS3(a, c)
      o.push(d)
    }
    return G(
      o,
      this.addition.order_by || "name",
      this.addition.order_direction || "asc",
    )
  }
  async get(e, t) {
    await this.checkDogeToken()
    let i = this.getRemotePath(t),
      s = await this.client.headObject(i)
    if (s) {
      let a = ht(i)
      return this.fileItemFromS3(
        {
          name: a,
          size: s.size,
          isFolder: !1,
          modified: s.modified,
          path: i,
          etag: s.etag,
        },
        i,
      )
    }
    let n = this.addition.list_object_version === "v2" ? "v2" : "v1"
    if ((await this.client.listPrefixProbe(i, n)) || i === "" || i === "/")
      return {
        name: ht(i),
        size: 0,
        is_dir: !0,
        modified: new Date().toISOString(),
        sign: i,
        type: 1,
      }
    throw new Error(`Object not found: ${t}`)
  }
  async mkdir(e, t) {
    await this.checkDogeToken()
    let i = this.getRemotePath(t),
      s = Ur(this.addition.placeholder),
      n = oe(i, s)
    await this.client.putObject(n, new Uint8Array(0))
  }
  async rename(e, t, i) {
    await this.checkDogeToken()
    let s = this.getRemotePath(t),
      n = no(s),
      o = oe(n, i),
      a = await this.client.headObject(s)
    a
      ? (await this.client.copyObject(s, o, a.size),
        await this.client.deleteObject(s))
      : (await this.copyDirRecursive(s, o), await this.removeDirRecursive(s))
  }
  async move(e, t, i, s, n) {
    await this.checkDogeToken()
    let o = this.getRemotePath(s),
      a = this.getRemotePath(n)
    for (let c of i) {
      let d = oe(o, c),
        l = oe(a, c),
        u = await this.client.headObject(d)
      u
        ? (await this.client.copyObject(d, l, u.size),
          await this.client.deleteObject(d))
        : (await this.copyDirRecursive(d, l), await this.removeDirRecursive(d))
    }
  }
  async copy(e, t, i, s, n) {
    await this.checkDogeToken()
    let o = this.getRemotePath(s),
      a = this.getRemotePath(n)
    for (let c of i) {
      let d = oe(o, c),
        l = oe(a, c),
        u = await this.client.headObject(d)
      u
        ? await this.client.copyObject(d, l, u.size)
        : await this.copyDirRecursive(d, l)
    }
  }
  async copyDirRecursive(e, t) {
    let i = this.addition.list_object_version === "v2" ? "v2" : "v1",
      s = await this.client.listObjects(e, i, !0)
    for (let n of s) {
      let o = oe(e, n.name),
        a = oe(t, n.name)
      n.isFolder
        ? await this.copyDirRecursive(o, a)
        : await this.client.copyObject(o, a, n.size)
    }
  }
  async remove(e, t, i) {
    await this.checkDogeToken()
    let s = this.getRemotePath(t)
    if (i && i.length > 0)
      for (let n of i) {
        let o = oe(s, n)
        ;(await this.client.headObject(o))
          ? await this.client.deleteObject(o)
          : await this.removeDirRecursive(o)
      }
    else
      (await this.client.headObject(s))
        ? await this.client.deleteObject(s)
        : await this.removeDirRecursive(s)
  }
  async removeDirRecursive(e) {
    let t = this.addition.list_object_version === "v2" ? "v2" : "v1",
      i = await this.client.listObjects(e, t, !0)
    for (let n of i) {
      let o = oe(e, n.name)
      n.isFolder
        ? await this.removeDirRecursive(o)
        : await this.client.deleteObject(o)
    }
    let s = Ur(this.addition.placeholder)
    ;(await this.client.deleteObject(oe(e, s)).catch(() => {}),
      this.addition.placeholder &&
        (await this.client
          .deleteObject(oe(e, this.addition.placeholder))
          .catch(() => {})))
  }
  async put(e, t, i) {
    await this.checkDogeToken()
    let s = this.getRemotePath(t)
    await this.client.putObject(s, i)
  }
  async getDirectUploadInfo(e, t) {
    if (!this.addition.enable_direct_upload)
      throw new Error("Direct upload is not enabled")
    await this.checkDogeToken()
    let i = this.getRemotePath(e)
    return await this.client.getDirectUploadInfo(
      i,
      t,
      Number(this.addition.sign_url_expire) || 4,
      this.addition.direct_upload_host,
    )
  }
  async other(e, t, i) {
    if (e === "direct_upload" || e === "get_direct_upload_info") {
      let s = i?.name || i?.fileName || ht(t),
        n = no(t)
      return await this.getDirectUploadInfo(n, s)
    }
    throw new Error(`Unsupported method ${e}`)
  }
}
fe()
function oo(r, e) {
  return (r << e) | (r >>> (32 - e))
}
var $s = class r {
  h0 = 1732584193
  h1 = 4023233417
  h2 = 2562383102
  h3 = 271733878
  h4 = 3285377520
  block = new Uint8Array(64)
  blockLen = 0
  totalBytes = 0
  w = new Int32Array(80)
  update(e) {
    let t = e.length
    this.totalBytes += t
    let i = 0
    for (; i < t; ) {
      let s = 64 - this.blockLen,
        n = Math.min(s, t - i)
      ;(this.block.set(e.subarray(i, i + n), this.blockLen),
        (this.blockLen += n),
        (i += n),
        this.blockLen === 64 &&
          (this.processBlock(this.block), (this.blockLen = 0)))
    }
    return this
  }
  processBlock(e) {
    let t = this.w
    for (let c = 0; c < 16; c++) {
      let d = c * 4
      t[c] = (e[d] << 24) | (e[d + 1] << 16) | (e[d + 2] << 8) | e[d + 3]
    }
    for (let c = 16; c < 80; c++)
      t[c] = oo(t[c - 3] ^ t[c - 8] ^ t[c - 14] ^ t[c - 16], 1)
    let i = this.h0,
      s = this.h1,
      n = this.h2,
      o = this.h3,
      a = this.h4
    for (let c = 0; c < 80; c++) {
      let d = 0,
        l = 0
      c < 20
        ? ((d = (s & n) | (~s & o)), (l = 1518500249))
        : c < 40
          ? ((d = s ^ n ^ o), (l = 1859775393))
          : c < 60
            ? ((d = (s & n) | (s & o) | (n & o)), (l = 2400959708))
            : ((d = s ^ n ^ o), (l = 3395469782))
      let u = (oo(i, 5) + d + a + l + t[c]) | 0
      ;((a = o), (o = n), (n = oo(s, 30)), (s = i), (i = u))
    }
    ;((this.h0 = (this.h0 + i) | 0),
      (this.h1 = (this.h1 + s) | 0),
      (this.h2 = (this.h2 + n) | 0),
      (this.h3 = (this.h3 + o) | 0),
      (this.h4 = (this.h4 + a) | 0))
  }
  getStateHex() {
    let e = [this.h0, this.h1, this.h2, this.h3, this.h4],
      t = ""
    for (let i of e) {
      let s = (i & 255).toString(16).padStart(2, "0"),
        n = ((i >>> 8) & 255).toString(16).padStart(2, "0"),
        o = ((i >>> 16) & 255).toString(16).padStart(2, "0"),
        a = ((i >>> 24) & 255).toString(16).padStart(2, "0")
      t += s + n + o + a
    }
    return t.toLowerCase()
  }
  digestHex() {
    let e = new r()
    ;((e.h0 = this.h0),
      (e.h1 = this.h1),
      (e.h2 = this.h2),
      (e.h3 = this.h3),
      (e.h4 = this.h4),
      e.block.set(this.block),
      (e.blockLen = this.blockLen),
      (e.totalBytes = this.totalBytes))
    let t = e.blockLen < 56 ? 56 - e.blockLen : 120 - e.blockLen,
      i = new Uint8Array(t + 8)
    i[0] = 128
    let s = e.totalBytes * 8,
      n = Math.floor(e.totalBytes / 536870912),
      o = (s & 4294967295) >>> 0,
      a = new DataView(i.buffer, i.byteOffset + t, 8)
    return (
      a.setUint32(0, n, !1),
      a.setUint32(4, o, !1),
      e.update(i),
      [e.h0, e.h1, e.h2, e.h3, e.h4]
        .map((d) => (d >>> 0).toString(16).padStart(8, "0"))
        .join("")
        .toLowerCase()
    )
  }
}
function Ll(r) {
  if (typeof Buffer < "u") return Buffer.from(r).toString("base64")
  let e = ""
  for (let t = 0; t < r.length; t++) e += String.fromCharCode(r[t])
  return btoa(e)
}
function Nl(r) {
  let e = new Map()
  if (!r) return e
  let t = r.split(";")
  for (let i of t) {
    let s = i.trim()
    if (!s) continue
    let n = s.indexOf("=")
    if (n > 0) {
      let o = s.slice(0, n).trim(),
        a = s.slice(n + 1).trim()
      o && a && e.set(o, a)
    }
  }
  return e
}
function js(r) {
  let e = []
  for (let [t, i] of r.entries()) t && i && e.push(`${t}=${i}`)
  return e.join("; ")
}
var zs = class {
  cookies = new Map()
  onCookieUpdate
  pendingCookie = null
  addition
  constructor(e, t) {
    ;((this.addition = e),
      (this.cookies = Nl(e.cookies || "")),
      (this.onCookieUpdate = t))
  }
  getCookies() {
    return this.cookies
  }
  getCookieStr() {
    return js(this.cookies)
  }
  setCookiesStr(e) {
    ;((this.cookies = Nl(e)),
      (this.pendingCookie = js(this.cookies)),
      (this.addition.cookies = this.pendingCookie),
      this.onCookieUpdate && this.onCookieUpdate(this.pendingCookie))
  }
  updateCookiesFromHeaders(e) {
    let t = e.getSetCookie,
      i = []
    if (typeof t == "function") i = t.call(e)
    else {
      let n = e.get("set-cookie")
      n && (i = [n])
    }
    let s = !1
    for (let n of i) {
      let o = n.split(";")[0] || "",
        a = o.indexOf("=")
      if (a > 0) {
        let c = o.slice(0, a).trim(),
          d = o.slice(a + 1).trim()
        c &&
          d &&
          this.cookies.get(c) !== d &&
          (this.cookies.set(c, d), (s = !0))
      }
    }
    s &&
      ((this.pendingCookie = js(this.cookies)),
      (this.addition.cookies = this.pendingCookie),
      this.onCookieUpdate && this.onCookieUpdate(this.pendingCookie))
  }
  consumePendingCookie() {
    let e = this.pendingCookie
    return ((this.pendingCookie = null), e)
  }
  loginType() {
    let e = this.cookies.get("wy_uf") || "",
      t = this.cookies.get("weiyun_wx_openid") || "",
      i = this.cookies.get("weiyun_qq_openid") || ""
    return e === "2" && t
      ? "weixin_openid"
      : e === "2" && i
        ? "qq_openid"
        : e === "1"
          ? "weixin"
          : e === "0" || !e
            ? "qq"
            : "unknown"
  }
  parseTokenInfo() {
    switch (this.loginType()) {
      case "weixin":
        return {
          token_type: 1,
          openid: this.cookies.get("openid") || "",
          open_appid: this.cookies.get("wy_appid") || "",
          access_token: this.cookies.get("access_token") || "",
          login_key_type: 192,
          login_key_value: this.cookies.get("access_token") || "",
        }
      case "qq":
        return {
          token_type: 0,
          login_key_type: 27,
          login_key_value:
            this.cookies.get("p_skey") || this.cookies.get("skey") || "",
          openid: "",
        }
      case "weixin_openid":
      case "qq_openid":
        return { token_type: 3, login_key_type: 1540 }
      default:
        return {}
    }
  }
  async refreshCtoken() {
    let e = await fetch("https://www.weiyun.com/disk", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Cookie: this.getCookieStr(),
      },
      redirect: "manual",
    })
    if (
      (this.updateCookiesFromHeaders(e.headers),
      e.status >= 300 && e.status < 400)
    ) {
      let t = e.headers.get("location") || ""
      if (t && !t.includes("/disk"))
        throw new Error(
          "[WeiYun] Login cookie expired or invalid, please login again",
        )
    }
  }
  async weixinRefreshToken() {
    let e = this.cookies.get("wy_appid") || "",
      t = this.cookies.get("refresh_token") || ""
    if (!e || !t) return
    let i = `https://api.weixin.qq.com/sns/oauth2/refresh_token?grant_type=refresh_token&appid=${encodeURIComponent(e)}&refresh_token=${encodeURIComponent(t)}`,
      n = await (await fetch(i)).json().catch(() => ({}))
    if (n.errcode)
      throw new Error(`[WeiYun] WeChat refresh token failed: ${n.errmsg}`)
    ;(n.openid && this.cookies.set("openid", n.openid),
      n.access_token && this.cookies.set("access_token", n.access_token),
      n.refresh_token && this.cookies.set("refresh_token", n.refresh_token),
      (this.pendingCookie = js(this.cookies)),
      (this.addition.cookies = this.pendingCookie),
      this.onCookieUpdate && this.onCookieUpdate(this.pendingCookie))
  }
  newHeader(e, t) {
    let i = t.openid || t.minico_openid || ""
    return {
      seq: Math.floor(Date.now() / 1e3),
      cmd: e,
      wx_openid: i,
      qq_openid: t.qq_openid || "",
      user_flag: t.token_type ?? 0,
      env_id: t.env_id || "",
      type: 1,
      appid: 30013,
      version: 3,
      major_version: 3,
      minor_version: 3,
      fix_version: 3,
    }
  }
  newBody(e, t, i) {
    return {
      ReqMsg_body: {
        ext_req_head: { token_info: i, language_info: { language_type: 2052 } },
        [`.weiyun.${e}MsgReq_body`]: t,
      },
    }
  }
  newUploadJson(e, t, i) {
    return {
      req_header: {
        cmd: t,
        appid: 30013,
        major_version: 3,
        minor_version: 0,
        fix_version: 0,
        version: 3,
        user_flag: 0,
      },
      req_body: { ReqMsg_body: { [`weiyun.${e}MsgReq_body`]: i } },
    }
  }
  async request(e, t, i, s, n) {
    let o = this.parseTokenInfo(),
      a = this.cookies.get("wyctoken") || "",
      c = "",
      d,
      l = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.weiyun.com",
        Cookie: this.getCookieStr(),
      }
    if (e === "preUpload")
      ((c = `https://www.weiyun.com/api/v3/ftn_pre_upload?g_tk=${encodeURIComponent(a)}&cmd=${i}`),
        (d = JSON.stringify(this.newUploadJson(t, i, s))),
        (l["Content-Type"] = "application/json; charset=UTF-8"))
    else if (e === "upload") {
      c = `https://upload.weiyun.com/ftnup_v2/weiyun?g_tk=${encodeURIComponent(a)}&cmd=${i}`
      let m = "----WebKitFormBoundaryIifrOqiswelC8nfe"
      l["Content-Type"] = `multipart/form-data; boundary=${m}`
      let w = JSON.stringify(this.newUploadJson(t, i, s)),
        g = `--${m}\r
Content-Disposition: form-data; name="json"\r
\r
${w}\r
`,
        y = ""
      n &&
        n.length > 0 &&
        (y = `--${m}\r
Content-Disposition: form-data; name="upload"; filename="blob"\r
Content-Type: application/octet-stream\r
\r
`)
      let v = `\r
--${m}--\r
`,
        x = new TextEncoder(),
        _ = x.encode(g),
        b = n ? x.encode(y) : new Uint8Array(0),
        S = x.encode(v),
        A = n ? new Uint8Array(n) : new Uint8Array(0),
        C = _.length + b.length + A.length + S.length,
        P = new Uint8Array(C),
        k = 0
      ;(P.set(_, k),
        (k += _.length),
        b.length > 0 &&
          (P.set(b, k), (k += b.length), P.set(A, k), (k += A.length)),
        P.set(S, k),
        (d = P))
    } else
      ((c = `https://www.weiyun.com/webapp/json/${e}/${t}?g_tk=${encodeURIComponent(a)}&cmd=${i}`),
        (d = JSON.stringify({
          req_header: JSON.stringify(this.newHeader(i, o)),
          req_body: JSON.stringify(this.newBody(t, s, o)),
        })),
        (l["Content-Type"] = "application/json; charset=UTF-8"))
    let u = await fetch(c, { method: "POST", headers: l, body: d })
    if ((this.updateCookiesFromHeaders(u.headers), u.status === 403))
      try {
        ;(await this.refreshCtoken(),
          (this.loginType() === "weixin" ||
            this.loginType() === "weixin_openid") &&
            (await this.weixinRefreshToken().catch(() => {}),
            await this.refreshCtoken()),
          (l.Cookie = this.getCookieStr()),
          (l.g_tk = this.cookies.get("wyctoken") || ""),
          (u = await fetch(c, { method: "POST", headers: l, body: d })),
          this.updateCookiesFromHeaders(u.headers))
      } catch (m) {
        throw new Error(`[WeiYun] Request failed (403): ${m.message}`)
      }
    if (!u.ok) {
      let m = await u.text().catch(() => "")
      throw new Error(`[WeiYun] HTTP ${u.status}: ${m}`)
    }
    let f = await u.json().catch(() => ({})),
      p = f.data || f.result
    if (f.ret !== void 0 && f.ret !== 0)
      throw new Error(`[WeiYun] Error (${f.ret}): ${f.msg || "Unknown"}`)
    if (p?.rsp_header && p.rsp_header.retcode !== 0) {
      let m = p.rsp_header
      throw new Error(
        `[WeiYun] Cmd ${m.cmd} (${m.cmdName || t}) Error (${m.retcode}): ${m.retmsg || "Unknown error"}`,
      )
    }
    if (e === "preUpload")
      return p?.rsp_body?.RspMsg_body?.weiyunPreUploadMsgRsp_body || f
    if (e === "upload")
      return p?.rsp_body?.RspMsg_body?.[`weiyun.${t}MsgRsp_body`] || f
    let h = p?.rsp_body?.RspMsg_body
    if (typeof h == "string")
      try {
        return JSON.parse(h)
      } catch {
        return h
      }
    return h || p || f
  }
  async diskUserInfoGet() {
    return this.request("weiyunQdiskClient", "DiskUserInfoGet", 2201, {
      is_get_upload_flow_flag: !1,
      is_get_high_speed_flow_info: !1,
      is_get_weiyun_flag: !1,
      is_get_space_clean_info: !1,
      is_get_user_reward_info: !1,
    })
  }
  async libDirPathGet(e) {
    return (
      (
        await this.request("weiyunFileLibClient", "LibDirPathGet", 26150, {
          dir_key: e,
        })
      ).items || []
    )
  }
  async diskDirFileList(e, t = {}) {
    return this.request("weiyunQdisk", "DiskDirList", 2208, {
      dir_key: e,
      start: t.start || 0,
      count: t.count || 500,
      sort_field: t.sortField ?? 2,
      reverse_order: t.reverseOrder ?? !1,
      get_type: t.getType ?? 0,
      get_abstract_url: !1,
      get_dir_detail_info: !1,
    })
  }
  async diskFileDownload(e) {
    let i =
      (
        await this.request("weiyunQdiskClient", "DiskFileBatchDownload", 2402, {
          file_list: [e],
          download_type: 0,
        })
      ).file_list || []
    if (!i || i.length === 0)
      throw new Error("[WeiYun] No download link returned")
    return i[0]
  }
  async diskDirCreate(e) {
    return this.request("weiyunQdiskClient", "DiskDirCreate", 2614, {
      ppdir_key: e.ppdir_key,
      pdir_key: e.pdir_key,
      dir_name: e.dir_name,
      file_exist_option: 2,
      create_type: 1,
    })
  }
  async diskFileRename(e, t) {
    await this.request("weiyunQdiskClient", "DiskFileRename", 2605, {
      ppdir_key: e.ppdir_key,
      pdir_key: e.pdir_key,
      file_id: e.file_id,
      src_filename: e.filename,
      filename: t,
    })
  }
  async diskDirAttrModify(e, t) {
    await this.request("weiyunQdiskClient", "DiskDirAttrModify", 2615, {
      ppdir_key: e.ppdir_key,
      pdir_key: e.pdir_key,
      dir_key: e.dir_key,
      src_dir_name: e.dir_name,
      dst_dir_name: t,
    })
  }
  async diskFileDelete(e) {
    await this.request("weiyunQdiskClient", "DiskDirFileBatchDeleteEx", 2509, {
      file_list: [e],
    })
  }
  async diskDirDelete(e) {
    await this.request("weiyunQdiskClient", "DiskDirFileBatchDeleteEx", 2509, {
      dir_list: [e],
    })
  }
  async diskFileMove(e, t) {
    await this.request("weiyunQdiskClient", "DiskDirFileBatchMove", 2618, {
      src_ppdir_key: e.ppdir_key,
      src_pdir_key: e.pdir_key,
      file_list: [e],
      dst_ppdir_key: t.pdir_key,
      dst_pdir_key: t.dir_key,
    })
  }
  async diskDirMove(e, t) {
    await this.request("weiyunQdiskClient", "DiskDirFileBatchMove", 2618, {
      src_ppdir_key: e.ppdir_key,
      src_pdir_key: e.pdir_key,
      dir_list: [e],
      dst_ppdir_key: t.pdir_key,
      dst_pdir_key: t.dir_key,
    })
  }
  async preUpload(e, t, i, s, n, o = 4, a = 1) {
    let d = 0,
      l = s,
      u = 0
    s > 0 &&
      ((l = s % 1048576),
      l === 0 && (l = 1048576),
      (u = l % 128),
      u === 0 && (u = 128),
      (d = s - l))
    let f = [],
      p = new $s()
    for (let _ = 0; _ < d; _ += 1048576) {
      let b = n.subarray(_, _ + 1048576)
      ;(p.update(b), f.push({ sha: p.getStateHex(), offset: _, size: 1048576 }))
    }
    let h = n.subarray(d, d + l - u)
    p.update(h)
    let m = p.getStateHex(),
      w = n.subarray(d + l - u, s)
    p.update(w)
    let g = Ll(w),
      y = p.digestHex()
    f.push({ sha: y, offset: d, size: l })
    let v = {
        common_upload_req: {
          ppdir_key: e,
          pdir_key: t,
          file_size: s,
          filename: i,
          file_exist_option: a,
          use_mutil_channel: !0,
        },
        upload_scr: 0,
        channel_count: o,
        block_size: 1048576,
        check_sha: m,
        check_data: g,
        block_info_list: f,
      },
      x = await this.request("preUpload", "PreUpload", 247120, v)
    return (
      x.common_upload_rsp &&
        ((x.common_upload_rsp.file_sha = y),
        (x.common_upload_rsp.file_size = s)),
      x
    )
  }
  async addUploadChannel(e, t, i) {
    return this.request("upload", "AddChannel", 247122, {
      upload_key: i.upload_key,
      ex: i.ex,
      orig_channel_count: e,
      dest_channel_count: t,
      speed: 4303,
    })
  }
  async uploadPiece(e, t, i) {
    let s = await this.request(
      "upload",
      "UploadPiece",
      247121,
      { upload_key: t.upload_key, ex: t.ex, channel: e },
      i,
    )
    return (
      s.channel &&
        s.channel.len === 0 &&
        s.upload_state === 1 &&
        (s.channel.len = e.len),
      s
    )
  }
}
var Eh = 45,
  Ml = 1024 * 1024
function Dh(r) {
  return Buffer.from(JSON.stringify(r), "utf8").toString("base64")
}
function Fh(r) {
  try {
    let e = JSON.parse(Buffer.from(r, "base64").toString("utf8"))
    if (
      !e ||
      !e.uploadKey ||
      !e.ex ||
      !Number.isInteger(e.partCount) ||
      e.partCount < 1
    )
      throw new Error("invalid upload session")
    return e
  } catch {
    throw new Error(
      "[WeiYun] \u4E0A\u4F20\u4F1A\u8BDD\u65E0\u6548\u6216\u5DF2\u635F\u574F",
    )
  }
}
function Wl(r) {
  if (!r) return new Date().toISOString()
  try {
    let e = typeof r == "string" ? parseInt(r, 10) : r
    if (!isNaN(e) && e > 0) {
      let i = e < 1e10 ? e * 1e3 : e
      return new Date(i).toISOString()
    }
    let t = new Date(r)
    if (!isNaN(t.getTime())) return t.toISOString()
  } catch {}
  return new Date().toISOString()
}
function Hl(r) {
  return {
    name: r.dir_name,
    size: 0,
    is_dir: !0,
    modified: Wl(r.dir_mtime || r.dir_ctime),
    sign: r.dir_key,
    type: 1,
    thumb: "",
    raw_url: "",
  }
}
function Kl(r) {
  return {
    name: r.filename,
    size: r.file_size || 0,
    is_dir: !1,
    modified: Wl(r.file_mtime || r.file_ctime),
    sign: r.file_id,
    type: L(r.filename, !1),
    thumb: r.ext_info?.thumb_url || "",
    raw_url: "",
  }
}
function ao(r) {
  let e = { ...(r || {}) }
  return (
    (e.root_folder_id = (e.root_folder_id || "").trim()),
    (e.cookies = (e.cookies || "").trim()),
    (e.order_by = e.order_by || "name"),
    (e.order_direction = e.order_direction || "asc"),
    (e.upload_thread = e.upload_thread || "4"),
    e
  )
}
var Ls = class {
  client
  addition
  rootFolderId = ""
  rootPdirKey = ""
  uploadThreads = 4
  pathFolderCache = new Map()
  budget = { used: 0, limit: Eh }
  constructor(e, t) {
    ;((this.addition = ao(e)), (this.client = new zs(this.addition, t)))
  }
  async init() {
    let e = parseInt(this.addition.upload_thread || "4", 10)
    if (
      ((this.uploadThreads = Math.min(32, Math.max(4, isNaN(e) ? 4 : e))),
      (this.addition.upload_thread = String(this.uploadThreads)),
      await this.client.refreshCtoken(),
      this.addition.root_folder_id)
    )
      this.rootFolderId = this.addition.root_folder_id
    else {
      let s = await this.client.diskUserInfoGet()
      ;((this.rootFolderId = s.main_dir_key || s.root_dir_key || ""),
        (this.addition.root_folder_id = this.rootFolderId))
    }
    if (!this.rootFolderId)
      throw new Error("[WeiYun] Failed to obtain root folder ID")
    let t = await this.client.libDirPathGet(this.rootFolderId)
    if (!t || t.length === 0)
      throw new Error(
        `[WeiYun] Invalid root directory ID: ${this.rootFolderId}`,
      )
    let i = t[t.length - 1]
    ;((this.rootPdirKey = i.pdir_key || ""),
      this.pathFolderCache.set("/", {
        dirKey: this.rootFolderId,
        pdirKey: this.rootPdirKey,
        dirName: i.dir_name || "root",
      }))
  }
  consumePendingCookie() {
    return this.client.consumePendingCookie()
  }
  async resolveFolder(e) {
    let t =
      "/" +
      String(e || "")
        .split("/")
        .filter(Boolean)
        .join("/")
    if (t === "/" || t === `/${this.rootFolderId}`)
      return {
        dirKey: this.rootFolderId,
        pdirKey: this.rootPdirKey,
        dirName: "root",
      }
    if (this.pathFolderCache.has(t)) return this.pathFolderCache.get(t)
    let i = t.split("/").filter(Boolean),
      s = {
        dirKey: this.rootFolderId,
        pdirKey: this.rootPdirKey,
        dirName: "root",
      },
      n = ""
    for (let o = 0; o < i.length; o++) {
      let a = i[o],
        c = (() => {
          try {
            return decodeURIComponent(a)
          } catch {
            return a
          }
        })()
      if (
        ((n = "/" + i.slice(0, o + 1).join("/")), this.pathFolderCache.has(n))
      ) {
        s = this.pathFolderCache.get(n)
        continue
      }
      ;(this.budget.used++,
        this.budget.used >= this.budget.limit &&
          console.warn(
            `[WeiYun] Cloudflare Worker subrequest budget limit (${this.budget.limit}) reached.`,
          ))
      let u = (
        (
          await this.client.diskDirFileList(s.dirKey, {
            count: 500,
            getType: 1,
          })
        ).dir_list || []
      ).find((f) => f.dir_name === a || f.dir_name === c || f.dir_key === a)
      if (!u)
        throw new Error(
          `[WeiYun] Directory '${a}' not found in folder '${s.dirKey}'`,
        )
      ;((s = { dirKey: u.dir_key, pdirKey: s.dirKey, dirName: u.dir_name }),
        this.pathFolderCache.set(n, s))
    }
    return s
  }
  async resolveFile(e) {
    let t = String(e || "")
      .split("/")
      .filter(Boolean)
    if (t.length === 0) throw new Error("[WeiYun] \u8DEF\u5F84\u65E0\u6548")
    let i = t[t.length - 1],
      s = (() => {
        try {
          return decodeURIComponent(i)
        } catch {
          return i
        }
      })(),
      n = "/" + t.slice(0, t.length - 1).join("/"),
      o = await this.resolveFolder(n)
    this.budget.used++
    let a = await this.client.diskDirFileList(o.dirKey, {
        count: 500,
        getType: 0,
      }),
      c = (a.file_list || []).find(
        (l) => l.filename === i || l.filename === s || l.file_id === i,
      )
    if (c) return { file: c, parent: o, isDir: !1 }
    let d = (a.dir_list || []).find(
      (l) => l.dir_name === i || l.dir_name === s || l.dir_key === i,
    )
    if (d) return { folder: d, parent: o, isDir: !0 }
    throw new Error(
      `[WeiYun] \u6587\u4EF6\u6216\u76EE\u5F55\u672A\u627E\u5230: ${i}`,
    )
  }
  async list(e, t) {
    this.budget.used = 0
    let i = await this.resolveFolder(t),
      s = [],
      n = [],
      o = 0
    for (;;) {
      if ((this.budget.used++, this.budget.used >= this.budget.limit)) {
        console.warn(
          `[WeiYun] Subrequest budget limit (${this.budget.limit}) reached while listing ${t}`,
        )
        break
      }
      let c =
          this.addition.order_by === "size"
            ? 3
            : this.addition.order_by === "updated_at"
              ? 2
              : 1,
        d = this.addition.order_direction === "desc",
        l = await this.client.diskDirFileList(i.dirKey, {
          start: o,
          count: 500,
          sortField: c,
          reverseOrder: d,
          getType: 0,
        }),
        u = l.dir_list || [],
        f = l.file_list || []
      for (let p of u) ((p.pdir_key = i.dirKey), s.push(p))
      for (let p of f) ((p.pdir_key = i.dirKey), n.push(p))
      if (
        ((o = s.length + n.length),
        l.finish_flag || (u.length === 0 && f.length === 0))
      )
        break
    }
    let a = [...s.map(Hl), ...n.map(Kl)]
    return G(
      a,
      this.addition.order_by === "size"
        ? "size"
        : this.addition.order_by === "updated_at"
          ? "updated_at"
          : "name",
      this.addition.order_direction,
    )
  }
  async get(e, t) {
    this.budget.used = 0
    let i =
      "/" +
      String(t || "")
        .split("/")
        .filter(Boolean)
        .join("/")
    if (i === "/" || i === `/${this.rootFolderId}`)
      return {
        name: "root",
        size: 0,
        is_dir: !0,
        modified: new Date().toISOString(),
        sign: this.rootFolderId,
        type: 1,
        raw_url: "",
      }
    let { file: s, folder: n, parent: o, isDir: a } = await this.resolveFile(t)
    if (a && n) return Hl(n)
    if (s) {
      let c = Kl(s)
      try {
        let d = await this.client.diskFileDownload({
          ppdir_key: o.pdirKey,
          pdir_key: o.dirKey,
          file_id: s.file_id,
          filename: s.filename,
        })
        ;((c.raw_url = d.download_url),
          (c.raw_url_headers = {
            Cookie: `${d.cookie_name}=${d.cookie_value}`,
          }))
      } catch (d) {
        ;(console.warn(
          `[WeiYun] \u83B7\u53D6 ${s.filename} \u4E0B\u8F7D\u94FE\u63A5\u5931\u8D25:`,
          d.message,
        ),
          (c.raw_url_error = d.message))
      }
      return c
    }
    throw new Error(`[WeiYun] \u6761\u76EE\u672A\u627E\u5230: ${t}`)
  }
  async mkdir(e, t) {
    this.budget.used = 0
    let i = String(t || "")
        .split("/")
        .filter(Boolean),
      s = i.pop() || "\u65B0\u5EFA\u6587\u4EF6\u5939",
      n = "/" + i.join("/"),
      o = await this.resolveFolder(n)
    await this.client.diskDirCreate({
      ppdir_key: o.pdirKey,
      pdir_key: o.dirKey,
      dir_name: s,
    })
  }
  async rename(e, t, i) {
    this.budget.used = 0
    let { file: s, folder: n, parent: o, isDir: a } = await this.resolveFile(t)
    a && n
      ? await this.client.diskDirAttrModify(
          {
            ppdir_key: o.pdirKey,
            pdir_key: o.dirKey,
            dir_key: n.dir_key,
            dir_name: n.dir_name,
          },
          i,
        )
      : s &&
        (await this.client.diskFileRename(
          {
            ppdir_key: o.pdirKey,
            pdir_key: o.dirKey,
            file_id: s.file_id,
            filename: s.filename,
          },
          i,
        ))
  }
  async remove(e, t, i) {
    this.budget.used = 0
    let { file: s, folder: n, parent: o, isDir: a } = await this.resolveFile(t)
    a && n
      ? await this.client.diskDirDelete({
          ppdir_key: o.pdirKey,
          pdir_key: o.dirKey,
          dir_key: n.dir_key,
          dir_name: n.dir_name,
        })
      : s &&
        (await this.client.diskFileDelete({
          ppdir_key: o.pdirKey,
          pdir_key: o.dirKey,
          file_id: s.file_id,
          filename: s.filename,
        }))
  }
  async move(e, t, i, s, n) {
    this.budget.used = 0
    let { file: o, folder: a, parent: c, isDir: d } = await this.resolveFile(s),
      l = await this.resolveFolder(t)
    d && a
      ? await this.client.diskDirMove(
          {
            ppdir_key: c.pdirKey,
            pdir_key: c.dirKey,
            dir_key: a.dir_key,
            dir_name: a.dir_name,
          },
          { pdir_key: l.pdirKey, dir_key: l.dirKey },
        )
      : o &&
        (await this.client.diskFileMove(
          {
            ppdir_key: c.pdirKey,
            pdir_key: c.dirKey,
            file_id: o.file_id,
            filename: o.filename,
          },
          { pdir_key: l.pdirKey, dir_key: l.dirKey },
        ))
  }
  async copy(e, t, i, s, n) {
    throw new Error(
      "[WeiYun] \u5FAE\u4E91\u63A5\u53E3\u4E0D\u652F\u6301\u590D\u5236\u64CD\u4F5C (Copy not supported)",
    )
  }
  async put(e, t, i) {
    let s = String(t || "")
        .split("/")
        .filter(Boolean),
      n = s.pop()
    if (!n) throw new Error("[WeiYun] \u4E0A\u4F20\u8DEF\u5F84\u65E0\u6548")
    let o = "/" + s.join("/"),
      a = await this.resolveFolder(o),
      c = await this.client.preUpload(a.pdirKey, a.dirKey, n, i.length, i, 4, 1)
    if (c.file_exist) return
    let d = { upload_key: c.upload_key || "", ex: c.ex || "" },
      l = c.channel_list || []
    l.length === 0 && (l = [{ id: 0, offset: 0, len: i.length }])
    for (let u of l) {
      let f = { ...u }
      for (; f.offset < i.length; ) {
        let p = Math.min(f.len || Ml, i.length - f.offset),
          h = i.subarray(f.offset, f.offset + p),
          m = await this.client.uploadPiece(f, d, h)
        if (m.upload_state === 2) break
        m.channel ? (f = m.channel) : (f.offset += p)
      }
    }
  }
  async createUploadSession(e, t, i, s, n) {
    this.budget.used = 0
    let o = await this.resolveFolder(t || "/"),
      a = Ml,
      c = Math.max(1, Math.ceil(Math.max(0, Number(s) || 0) / a)),
      d = new Uint8Array(0),
      l = await this.client.preUpload(
        o.pdirKey,
        o.dirKey,
        i,
        Math.max(0, Number(s) || 0),
        d,
        4,
        1,
      )
    if (l.file_exist)
      return { reuse: !0, partCount: 0, chunkSize: a, session: "" }
    let u = { upload_key: l.upload_key || "", ex: l.ex || "" },
      f = l.channel_list || []
    if (f.length < this.uploadThreads && u.upload_key)
      try {
        let p = await this.client.addUploadChannel(
          f.length,
          this.uploadThreads,
          u,
        )
        p.channels && (f = [...f, ...p.channels])
      } catch {}
    return {
      reuse: !1,
      partCount: c,
      chunkSize: a,
      session: Dh({
        uploadKey: u.upload_key,
        ex: u.ex,
        parentDirKey: o.pdirKey,
        pdirKey: o.dirKey,
        fileName: i,
        size: Math.max(0, Number(s) || 0),
        partCount: c,
        chunkSize: a,
        channels: f,
      }),
    }
  }
  async uploadPart(e, t, i) {
    let s = Fh(e)
    if (!Number.isInteger(t) || t < 1 || t > s.partCount)
      throw new Error(`[WeiYun] \u5206\u7247\u5E8F\u53F7\u65E0\u6548: ${t}`)
    let n = (t - 1) * s.chunkSize,
      o = { id: t - 1, offset: n, len: i.length },
      a = { upload_key: s.uploadKey, ex: s.ex }
    return (await this.client.uploadPiece(o, a, i), { partNumber: t })
  }
  async completeUploadSession(e, t = []) {}
}
var xo = null
async function Bh() {
  if (!xo) {
    let { LocalDriver: r } = await Promise.resolve().then(() => (Vl(), Gl))
    xo = new r()
  }
  return xo
}
async function Rh(r) {
  if (typeof process < "u" && process.release?.name === "node") {
    let { SFTPDriver: e } = await Promise.resolve().then(() => (eu(), Zl)),
      t = new e(ce(r))
    return (await t.init?.(), t)
  }
  throw new Error(
    "SFTP storage driver requires Node.js runtime (raw TCP sockets not available in Cloudflare Workers)",
  )
}
async function Uh(r) {
  if (typeof process < "u" && process.release?.name === "node") {
    let { FTPDriver: e } = await Promise.resolve().then(() => (cu(), au)),
      t = new e(ce(r))
    return (await t.init?.(), t)
  }
  throw new Error(
    "FTP storage driver requires Node.js runtime (raw TCP sockets not available in Cloudflare Workers)",
  )
}
var _o = new Map(),
  qh = new Map(),
  Ws = new Map()
async function Oh(r, e, t) {
  let i = r.get(e)
  if (i) return i
  let s = t()
  r.set(e, s)
  try {
    return await s
  } catch (n) {
    throw (r.get(e) === s && r.delete(e), n)
  }
}
function ce(r) {
  let e = r?.addition
  return e ? (typeof e == "string" ? JSON.parse(e || "{}") : e) : {}
}
async function du(r, e) {
  let t = (r || "").toLowerCase().replace(/[^a-z0-9]/g, "")
  if (t === "local") {
    if (typeof process < "u" && process.release?.name === "node") return Bh()
    throw new Error(
      "Local storage driver requires Node.js runtime (not available in Cloudflare Workers)",
    )
  }
  if (t === "sftp") return Rh(e)
  if (t === "ftp") return Uh(e)
  if (!e)
    throw new Error(
      "failed get driver: storage config not found for driver " + r,
    )
  let i
  if (t === "onedriveapp") {
    i = new yi(ce(e))
    try {
      await i.init?.()
    } catch (s) {
      throw (console.error("onedrive_app init failed:", s), s)
    }
  } else if (
    t === "onedrive" ||
    t === "onedrivesb" ||
    t === "onedrivebusiness" ||
    t === "onedrivesharepoint" ||
    (t.startsWith("onedrive") && t !== "onedriveapp")
  ) {
    i = new mi(ce(e), async (s) => {
      try {
        let n = await U(),
          o = (n.storages || []).find((c) => c.id === e?.id)
        if (!o) return
        let a =
          typeof o.addition == "string"
            ? JSON.parse(o.addition || "{}")
            : o.addition || {}
        ;((a.refresh_token = s), (o.addition = JSON.stringify(a)), await $(n))
      } catch (n) {
        console.warn("[Onedrive] failed to persist refresh token:", n)
      }
    })
    try {
      await i.init?.()
    } catch (s) {
      throw (console.error("onedrive init failed:", s), s)
    }
  } else if (
    t === "aliyundrive" ||
    t === "aliyundriveopen" ||
    t === "aliyundriveshare" ||
    t === "aliyun" ||
    t === "aliyundriveshare2open" ||
    t === "aliyundriveoauth2" ||
    t.includes("aliyun")
  )
    ((i = new xi(ce(e))), await i.init?.())
  else if (
    t === "googledrive" ||
    t === "gdrive" ||
    t === "google" ||
    t.startsWith("google")
  )
    ((i = new vi(ce(e))), await i.init?.())
  else if (
    t === "quark" ||
    t === "quarkuc" ||
    t === "uc" ||
    t === "quarkcookie"
  )
    ((i = new ki(ce(e))), await i.init?.())
  else if (
    t === "123pan" ||
    t === "123" ||
    t === "123panshare" ||
    t.startsWith("123")
  ) {
    let s = ce(e)
    ;((i = new Pi(s, async (n) => {
      try {
        let o = await U(),
          a = (o.storages || []).find((d) => d.id === e?.id)
        if (!a) return
        let c =
          typeof a.addition == "string"
            ? JSON.parse(a.addition || "{}")
            : a.addition || {}
        ;((c.access_token = n), (a.addition = JSON.stringify(c)), await $(o))
      } catch (o) {
        console.warn("[123Pan] failed to persist access_token:", o)
      }
    })),
      await i.init?.())
  } else if (
    t === "baidunetdisk" ||
    t === "baidu" ||
    t === "baiduyun" ||
    t === "baiduphoto" ||
    t === "baidushare" ||
    t.startsWith("baidu")
  ) {
    let s = ce(e)
    ;((i = new Di(s, async (n) => {
      try {
        let o = await U(),
          a = (o.storages || []).find((d) => d.id === e?.id)
        if (!a) return
        let c =
          typeof a.addition == "string"
            ? JSON.parse(a.addition || "{}")
            : a.addition || {}
        ;((c.access_token = n.access_token),
          (c.refresh_token = n.refresh_token),
          (a.addition = JSON.stringify(Kt(c))),
          await $(o))
      } catch (o) {
        console.warn("[baidu_netdisk] failed to persist token:", o)
      }
    })),
      await i.init?.())
  } else if (
    t === "115open" ||
    t === "115" ||
    t === "115pan" ||
    t === "115cloud" ||
    t.startsWith("115")
  ) {
    let s = ce(e)
    ;((i = new Ii(s, async (n) => {
      try {
        let o = await U(),
          a = (o.storages || []).find((d) => d.id === e?.id)
        if (!a) return
        let c =
          typeof a.addition == "string"
            ? JSON.parse(a.addition || "{}")
            : a.addition || {}
        ;((c.access_token = n.access_token),
          (c.refresh_token = n.refresh_token),
          (a.addition = JSON.stringify(c)),
          await $(o))
      } catch (o) {
        console.warn("[115open] failed to persist token:", o)
      }
    })),
      await i.init?.())
  } else if (t === "github" || t === "githubapi" || t === "github_api") {
    let s = ce(e)
    ;((i = new Ri(s)), await i.init?.())
  } else if (
    t === "thunderexpert" ||
    t === "thunderbrowserexpert" ||
    t === "thunderxexpert" ||
    (t.includes("thunder") && t.includes("expert")) ||
    (t.includes("xunlei") && t.includes("expert"))
  ) {
    let s = ce(e)
    ;((i = new _s(s, async (n) => {
      try {
        ;(n.device_id && (s.device_id = n.device_id),
          n.refresh_token && (s.refresh_token = n.refresh_token),
          n.captcha_token && (s.captcha_token = n.captcha_token),
          (e.addition = JSON.stringify(s)))
        let o = await U(),
          a = (o.storages || []).find((c) => c.id === e?.id)
        if (a) {
          let c =
            typeof a.addition == "string"
              ? JSON.parse(a.addition || "{}")
              : a.addition || {}
          ;(n.refresh_token && (c.refresh_token = n.refresh_token),
            n.captcha_token && (c.captcha_token = n.captcha_token),
            n.device_id && (c.device_id = n.device_id),
            (a.addition = JSON.stringify(c)),
            await $(o))
        }
      } catch (o) {
        console.warn("[thunderexpert] failed to persist token:", o)
      }
    })),
      await i.init?.())
  } else if (
    t === "thunder" ||
    t === "xunlei" ||
    t === "thunderbrowser" ||
    t === "thunderx" ||
    t.includes("thunder") ||
    t.includes("xunlei")
  ) {
    let s = ce(e)
    ;((i = new Tr(s, async (n) => {
      try {
        ;(n.device_id && (s.device_id = n.device_id),
          n.refresh_token && (s.refresh_token = n.refresh_token),
          n.captcha_token && (s.captcha_token = n.captcha_token),
          (e.addition = JSON.stringify(s)))
        let o = await U(),
          a = (o.storages || []).find((c) => c.id === e?.id)
        if (a) {
          let c =
            typeof a.addition == "string"
              ? JSON.parse(a.addition || "{}")
              : a.addition || {}
          ;(n.refresh_token && (c.refresh_token = n.refresh_token),
            n.captcha_token && (c.captcha_token = n.captcha_token),
            n.device_id && (c.device_id = n.device_id),
            (a.addition = JSON.stringify(c)),
            await $(o))
        }
      } catch (o) {
        console.warn("[thunder] failed to persist token:", o)
      }
    })),
      await i.init?.())
  } else if (
    t === "lanzou" ||
    t === "lanzoupan" ||
    t === "ilanzou" ||
    t === "lanzoui" ||
    t === "lanzous"
  ) {
    let s = ce(e)
    ;((i = new ks(s, async (n) => {
      try {
        let o = await U(),
          a = (o.storages || []).find((d) => d.id === e?.id)
        if (!a) return
        let c =
          typeof a.addition == "string"
            ? JSON.parse(a.addition || "{}")
            : a.addition || {}
        ;((c.cookie = n), (a.addition = JSON.stringify(c)), await $(o))
      } catch (o) {
        console.warn("[Lanzou] failed to persist cookie:", o)
      }
    })),
      await i.init?.())
  } else if (
    t === "189" ||
    t === "189cloud" ||
    t === "cloud189" ||
    t === "ctyun" ||
    t === "189pan" ||
    t === "189cloudpc" ||
    t === "189cloudapp" ||
    t.startsWith("189") ||
    t.includes("cloud189")
  ) {
    let s = ce(e)
    ;((i = new Cs(s)), await i.init?.())
  } else if (t === "webdav" || t === "webdavdriver") {
    let s = ce(e)
    ;((i = new Ds(s)), await i.init?.())
  } else if (
    t === "s3" ||
    t === "doge" ||
    t === "dogecloud" ||
    t === "minio" ||
    t === "ceph" ||
    t === "aws" ||
    t === "r2" ||
    t === "b2" ||
    t === "cos" ||
    t === "oss" ||
    t === "kodo"
  ) {
    let s = ce(e)
    ;((i = new Os(s, e.driver || "S3")), await i.init?.())
  } else if (
    t === "wopan" ||
    t === "unicom" ||
    t === "unicomcloud" ||
    t === "woyun" ||
    t === "chinaunicom"
  ) {
    let s = ce(e)
    ;((i = new Bs(s, async (n, o) => {
      try {
        let a = await U(),
          c = (a.storages || []).find((l) => l.id === e?.id)
        if (!c) return
        let d =
          typeof c.addition == "string"
            ? JSON.parse(c.addition || "{}")
            : c.addition || {}
        ;((d.access_token = n),
          (d.refresh_token = o),
          (c.addition = JSON.stringify(ro(d))),
          await $(a))
      } catch (a) {
        console.warn("[WoPan] failed to persist tokens:", a)
      }
    })),
      await i.init?.())
  } else if (
    t === "weiyun" ||
    t === "tencentweiyun" ||
    t === "txweiyun" ||
    t.includes("weiyun")
  ) {
    let s = ce(e)
    ;((i = new Ls(s, async (n) => {
      try {
        let o = await U(),
          a = (o.storages || []).find((d) => d.id === e?.id)
        if (!a) return
        let c =
          typeof a.addition == "string"
            ? JSON.parse(a.addition || "{}")
            : a.addition || {}
        ;((c.cookies = n), (a.addition = JSON.stringify(ao(c))), await $(o))
      } catch (o) {
        console.warn("[WeiYun] failed to persist cookies:", o)
      }
    })),
      await i.init?.())
  } else throw new Error("failed get driver: unsupported driver '" + r + "'")
  return i
}
async function ee(r, e) {
  if ((r || "").toLowerCase().replace(/[^a-z0-9]/g, "") === "local")
    return du(r, e)
  if (!e)
    throw new Error(
      "failed get driver: storage config not found for driver " + r,
    )
  let i = `${e.id}_${e.modified}`,
    s = _o.get(i)
  return (
    s ||
    Oh(qh, i, async () => {
      let n = _o.get(i)
      if (n) return n
      let o = await du(r, e)
      return (_o.set(i, o), o)
    })
  )
}
function $h(r) {
  let e = (r || "").toLowerCase().replace(/[^a-z0-9]/g, "")
  return (
    e === "189" ||
    e === "189cloud" ||
    e === "cloud189" ||
    e === "ctyun" ||
    e === "189pan"
  )
}
async function jh(r, e) {
  if (r)
    try {
      r(e)
      return
    } catch {}
  await e
}
async function zh(r, e) {
  let t = String(r?.id || "")
  if (!t) return
  let s = (Ws.get(t) || Promise.resolve())
    .catch(() => {})
    .then(async () => {
      let n = await U(),
        o = (n.storages || []).find((c) => String(c.id) === t)
      if (!o) return
      let a =
        typeof o.addition == "string"
          ? JSON.parse(o.addition || "{}")
          : o.addition || {}
      ;(a.cookies !== void 0 || lu(r?.driver)
        ? (a.cookies = e)
        : (a.cookie = e),
        (o.addition = JSON.stringify(a)),
        String(r?.id) === t && (r.addition = o.addition),
        await $(n))
    })
  Ws.set(t, s)
  try {
    await s
  } finally {
    Ws.get(t) === s && Ws.delete(t)
  }
}
function lu(r) {
  let e = (r || "").toLowerCase().replace(/[^a-z0-9]/g, "")
  return (
    e === "weiyun" ||
    e === "tencentweiyun" ||
    e === "txweiyun" ||
    e.includes("weiyun")
  )
}
async function be(r, e, t, i) {
  if (!$h(r) && !lu(r)) return
  let n = t.consumePendingCookie?.call(t)
  if (!n) return
  let o = zh(e, n).catch((a) => {
    console.warn(`[${r}] failed to persist cookie:`, a)
  })
  await jh(i?.waitUntil, o)
}
async function mt(r, e) {
  let t = await ne(r),
    i = [],
    s = "Virtual"
  if (t.storage) {
    s = t.storage.driver
    try {
      let c = await ee(s, t.storage)
      try {
        i = await c.list(r, t.physical)
      } finally {
        await be(s, t.storage, c, e)
      }
      if (t.storage.status !== "work") {
        t.storage.status = "work"
        let d = await U(),
          l = (d.storages || []).find((u) => u.id === t.storage?.id)
        l && ((l.status = "work"), await $(d))
      }
    } catch (c) {
      try {
        let d = await U(),
          l = (d.storages || []).find((u) => u.id === t.storage?.id)
        l && ((l.status = c.message || String(c)), await $(d))
      } catch (d) {
        console.warn("Failed to persist storage status:", d)
      }
      throw c
    }
  } else if (!t.isVirtual)
    throw new Error("failed get storage: storage not found")
  let o = ((await U()).storages || []).filter((c) => !c.disabled),
    a = t.cleanPath
  return (
    o.forEach((c) => {
      let d = "/" + (c.mount_path || "").split("/").filter(Boolean).join("/")
      if (d === a || d === "/") return
      let l = a === "/" ? "/" : a + "/"
      if (d.startsWith(l)) {
        let u = d.slice(l.length).split("/").filter(Boolean)[0]
        u &&
          !i.some((f) => f.name === u) &&
          i.push({
            name: u,
            size: 0,
            is_dir: !0,
            modified: c.modified || new Date().toISOString(),
            sign: "",
            type: 1,
          })
      }
    }),
    i.forEach((c) => {
      c.type || (c.type = L(c.name, c.is_dir))
    }),
    { content: i, provider: s, storage: t.storage }
  )
}
async function jr(r, e) {
  let t = await ne(r)
  if (t.isVirtual)
    return {
      item: {
        name: t.cleanPath.split("/").filter(Boolean).pop() || "root",
        size: 0,
        is_dir: !0,
        modified: new Date().toISOString(),
        sign: "",
        type: 1,
      },
      provider: "Virtual",
      rawUrl: "",
    }
  if (t.storage && t.relative === "/") {
    let o = t.cleanPath.split("/").filter(Boolean).pop() || "root",
      a = ce(t.storage)
    return {
      item: {
        name: o,
        size: 0,
        is_dir: !0,
        modified: t.storage.modified || new Date().toISOString(),
        sign: String(a.root_folder_id || ""),
        type: 1,
        raw_url: "",
      },
      provider: t.storage.driver,
      rawUrl: `/api/p${r.startsWith("/") ? "" : "/"}${r}`,
    }
  }
  let i = t.storage ? t.storage.driver : "Local",
    s = await ee(i, t.storage),
    n
  try {
    n = await s.get(r, t.physical)
  } finally {
    await be(i, t.storage, s, e)
  }
  return (
    n.type || (n.type = L(n.name, n.is_dir)),
    {
      item: n,
      provider: i,
      rawUrl: `/api/p${r.startsWith("/") ? "" : "/"}${r}`,
    }
  )
}
async function uu(r, e) {
  let t = await ne(r)
  if (t.isVirtual) throw new Error("failed get storage: storage not found")
  let i = await ee(t.storage.driver, t.storage)
  try {
    await i.mkdir(r, t.physical)
  } finally {
    await be(t.storage.driver, t.storage, i, e)
  }
}
async function fu(r, e, t) {
  let i = await ne(r)
  if (i.isVirtual) throw new Error("failed get storage: storage not found")
  let s = await ee(i.storage.driver, i.storage)
  try {
    await s.rename(r, i.physical, e)
  } finally {
    await be(i.storage.driver, i.storage, s, t)
  }
}
async function pu(r, e, t) {
  for (let i of e) {
    let s = `${r}/${i}`,
      n = await ne(s)
    if (n.isVirtual) throw new Error("failed get storage: storage not found")
    let o = await ee(n.storage.driver, n.storage)
    try {
      await o.remove(s, n.physical, [i])
    } finally {
      await be(n.storage.driver, n.storage, o, t)
    }
  }
}
async function hu(r, e, t, i) {
  for (let s of t) {
    let n = `${r}/${s}`,
      o = `${e}/${s}`,
      a = await ne(n),
      c = await ne(o)
    if (a.isVirtual || c.isVirtual)
      throw new Error("failed get storage: storage not found")
    let d = await ee(a.storage.driver, a.storage)
    try {
      await d.move(r, e, [s], a.physical, c.physical)
    } finally {
      await be(a.storage.driver, a.storage, d, i)
    }
  }
}
async function gu(r, e, t, i) {
  for (let s of t) {
    let n = `${r}/${s}`,
      o = `${e}/${s}`,
      a = await ne(n),
      c = await ne(o)
    if (a.isVirtual || c.isVirtual)
      throw new Error("failed get storage: storage not found")
    let d = await ee(a.storage.driver, a.storage)
    try {
      await d.copy(r, e, [s], a.physical, c.physical)
    } finally {
      await be(a.storage.driver, a.storage, d, i)
    }
  }
}
async function vo(r, e, t) {
  let i = await ne(r)
  if (i.isVirtual) throw new Error("failed get storage: storage not found")
  let s = await ee(i.storage.driver, i.storage)
  try {
    await s.put(r, i.physical, e)
  } finally {
    await be(i.storage.driver, i.storage, s, t)
  }
}
te()
var zr = (r) =>
  "/" +
  String(r || "")
    .split("/")
    .filter(Boolean)
    .join("/")
async function Jt(r, e, t) {
  let s = zr(r).split("/").filter(Boolean)
  if (s.length < 1) return { ok: !1, error: "Invalid share path" }
  let n, o
  if (s[0] === "@s") {
    if (s.length < 2) return { ok: !1, error: "Invalid share path" }
    ;((n = s[1]), (o = s.slice(2)))
  } else ((n = s[0]), (o = s.slice(1)))
  let a = await U(t),
    c = (a.shares || []).find((f) => f.id === n)
  if (!c) return { ok: !1, error: "share not found" }
  if (c.disabled) return { ok: !1, error: "share has been disabled" }
  if (c.expires && new Date(c.expires) < new Date())
    return { ok: !1, error: "share has expired" }
  if (
    c.max_accessed > 0 &&
    c.accessed !== void 0 &&
    c.accessed >= c.max_accessed
  )
    return { ok: !1, error: "share access count exceeded" }
  if (c.pwd && c.pwd !== e) return { ok: !1, error: "wrong password" }
  if (!c.files || c.files.length === 0)
    return { ok: !1, error: "share is empty" }
  if (
    ((c.accessed = (c.accessed || 0) + 1),
    $(a, t).catch(() => {}),
    c.files.length > 1 && o.length === 0)
  )
    return { ok: !0, share: c, virtualList: !0 }
  if (c.files.length === 1) {
    let f = zr(c.files[0]),
      p = zr([f, ...o].join("/"))
    return { ok: !0, share: c, realPath: p }
  }
  let d = o[0],
    l = c.files.find((f) => {
      let p = String(f).split("/").filter(Boolean)
      return p[p.length - 1] === d
    })
  if (!l) return { ok: !1, error: "path not found in share" }
  let u = zr([zr(l), ...o.slice(1)].join("/"))
  return { ok: !0, share: c, realPath: u }
}
te()
Ge()
var rg = {
  SEE_HIDES: 0,
  ACCESS_WITHOUT_PASSWORD: 1,
  OFFLINE_DOWNLOAD: 2,
  WRITE_CONTENT: 3,
  RENAME: 4,
  MOVE: 5,
  COPY: 6,
  DELETE: 7,
  WEBDAV_READ: 8,
  WEBDAV_MANAGE: 9,
  FTP_READ: 10,
  FTP_MANAGE: 11,
  READ_ARCHIVES: 12,
  DECOMPRESS: 13,
  SHARE: 14,
  CUSTOMIZE_SHARE_ID: 15,
}
function ig(r) {
  return !r || r.role === 1
}
function zo(r) {
  return !!r && r.role === 2
}
function sg(r, e) {
  return !r || r.disabled
    ? !1
    : zo(r)
      ? !0
      : ig(r)
        ? !1
        : ((r.permission >> e) & 1) === 1
}
function De(r) {
  return sg(r, rg.WRITE_CONTENT)
}
function ue(r, e = "/") {
  let t = e || "/"
  if (t.startsWith("/@s")) return t
  let i = (r?.base_path || "/").trim()
  if (!i || i === "/") return t.startsWith("/") ? t : `/${t}`
  ;(i.startsWith("/") || (i = `/${i}`),
    i.endsWith("/") && i.length > 1 && (i = i.replace(/\/+$/, "")))
  let s = t.startsWith("/") ? t : `/${t}`
  return s === "/" ? i : `${i}${s}`
}
te()
Ge()
Sr()
var ng = 24 * 3600
async function Hr(r) {
  try {
    let e = await U(r?.env),
      t = {}
    for (let n of e.settings || []) t[n.key] = n.value
    let i = t.sign_all === "true",
      s = parseInt(t.link_expiration, 10) || 0
    return !i && s <= 0
      ? { enabled: !1, expiresIn: 0 }
      : { enabled: !0, expiresIn: s > 0 ? s : ng }
  } catch {
    return { enabled: !1, expiresIn: 0 }
  }
}
async function Lo(r, e, t) {
  let i = await Ne(r),
    s = Math.floor(Date.now() / 1e3) + t,
    n = await Un(`${e}:${s}`, i)
  return `${s}.${n}`
}
async function e0(r, e, t) {
  let i = t.lastIndexOf(".")
  if (i <= 0) return !1
  let s = parseInt(t.slice(0, i), 10),
    n = t.slice(i + 1)
  if (!Number.isFinite(s) || s <= Math.floor(Date.now() / 1e3)) return !1
  let o = await Ne(r)
  return (await Un(`${e}:${s}`, o)) === n
}
Mr()
async function t0(r = {}, e) {
  let t = (r.parent || "/").replace(/\/+/g, "/") || "/",
    i = String(r.keywords || "")
      .trim()
      .toLowerCase(),
    s = r.scope ?? 0,
    n = Math.max(1, r.page || 1),
    o = Math.max(1, Math.min(100, r.per_page || 30)),
    a = r.max_depth ?? 10,
    c = r.max_results ?? 500,
    d = []
  async function l(h, m) {
    if (m > a || d.length >= c) return
    let w = []
    try {
      w = (await mt(h)).content || []
    } catch {
      return
    }
    for (let g of w) {
      if (d.length >= c) break
      let y = !i || g.name.toLowerCase().includes(i),
        v = !!g.is_dir,
        x = !0
      if (
        (s === 1 && !v && (x = !1),
        s === 2 && v && (x = !1),
        y &&
          x &&
          d.push({
            ...g,
            parent: h.endsWith("/") && h !== "/" ? h.slice(0, -1) : h,
          }),
        v)
      ) {
        let _ = h === "/" ? `/${g.name}` : `${h}/${g.name}`
        await l(_, m + 1)
      }
    }
  }
  await l(t, 0)
  let u = d.length,
    f = (n - 1) * o
  return { content: d.slice(f, f + o), total: u }
}
var he = new J(),
  Fe = (r) => {
    try {
      let e = r.executionCtx
      return !e || typeof e.waitUntil != "function"
        ? void 0
        : { waitUntil: (t) => e.waitUntil(t) }
    } catch {
      return
    }
  },
  Ve = (r) =>
    r.json({ code: 403, message: "Permission denied", data: null }, 403)
he.post("/dirs", async (r) => {
  let e = await r.req.json().catch(() => ({})),
    t = await Y(r),
    i = e.path || "/"
  if (!i.startsWith("/@s") && (!t || t.disabled))
    return r.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let n = Fe(r),
    o = i
  ;(!e.force_root || !zo(t)) && (o = ue(t, o))
  try {
    if (o.startsWith("/@s")) {
      let d = await Jt(o, e.password || "", r.env)
      if (!d.ok) return r.json({ code: 400, message: d.error, data: null })
      if (d.virtualList) {
        let f = []
        for (let p of d.share.files || [])
          try {
            let { item: h } = await jr(p, n)
            if (h.is_dir) {
              let m = String(p).split("/").filter(Boolean)
              f.push({
                name: m[m.length - 1] || p,
                size: 0,
                is_dir: !0,
                modified: h.modified || new Date().toISOString(),
                sign: "",
                thumb: "",
                type: 1,
              })
            }
          } catch {}
        return r.json({ code: 200, message: "success", data: f })
      }
      let { content: l } = await mt(d.realPath, n),
        u = l
          .filter((f) => f.is_dir)
          .map((f) => ({
            name: f.name,
            size: 0,
            is_dir: !0,
            modified: f.modified || new Date().toISOString(),
            sign: f.sign || "",
            thumb: f.thumb || "",
            type: 1,
          }))
      return r.json({ code: 200, message: "success", data: u })
    }
    let { content: a } = await mt(o, n),
      c = a
        .filter((d) => d.is_dir)
        .map((d) => ({
          name: d.name,
          size: 0,
          is_dir: !0,
          modified: d.modified || new Date().toISOString(),
          sign: d.sign || "",
          thumb: d.thumb || "",
          type: 1,
        }))
    return r.json({ code: 200, message: "success", data: c })
  } catch (a) {
    return r.json({ code: 500, message: ie(a), data: null })
  }
})
he.post("/list", async (r) => {
  let e = await r.req.json().catch(() => ({})),
    t = await Y(r)
  if (!(e.path || "/").startsWith("/@s") && (!t || t.disabled))
    return r.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let s = Fe(r),
    n = ue(t, e.path || "/"),
    o = parseInt(e.page, 10) || 1,
    a = parseInt(e.per_page, 10) || 0,
    c = (d) => {
      let l = d.length
      if (a <= 0) return { content: d, total: l }
      let f = (Math.max(1, o) - 1) * a,
        p = f + a
      return { content: d.slice(f, p), total: l }
    }
  try {
    if (n.startsWith("/@s")) {
      let x = await Jt(n, e.password || "", r.env)
      if (!x.ok) return r.json({ code: 400, message: x.error, data: null })
      if (x.virtualList) {
        let P = []
        for (let T of x.share.files || []) {
          let E = String(T).split("/").filter(Boolean),
            O = E[E.length - 1] || T
          try {
            let { item: q } = await jr(T, s)
            P.push({
              name: O,
              size: q.size || 0,
              is_dir: !!q.is_dir,
              modified: q.modified || new Date().toISOString(),
              sign: "",
              thumb: q.thumb || "",
              type: q.type ?? 0,
            })
          } catch {
            try {
              ;(await mt(T, s),
                P.push({
                  name: O,
                  size: 0,
                  is_dir: !0,
                  modified: new Date().toISOString(),
                  sign: "",
                  thumb: "",
                  type: 1,
                }))
            } catch {
              P.push({
                name: O,
                size: 0,
                is_dir: !1,
                modified: new Date().toISOString(),
                sign: "",
                thumb: "",
                type: 0,
              })
            }
          }
        }
        let { content: k, total: D } = c(P)
        return r.json({
          code: 200,
          message: "success",
          data: {
            content: k,
            total: D,
            readme: x.share.readme || "",
            header: x.share.header || "",
            write: !1,
            write_content_bypass: !1,
            provider: "Share",
          },
        })
      }
      let { content: _, provider: b } = await mt(x.realPath, s),
        S = _.map((P) => ({
          name: P.name,
          size: P.size,
          is_dir: P.is_dir,
          created: P.created || P.modified || new Date().toISOString(),
          modified: P.modified || new Date().toISOString(),
          sign: P.sign || "",
          thumb: P.thumb || "",
          type: P.type ?? 0,
        })),
        { content: A, total: C } = c(S)
      return r.json({
        code: 200,
        message: "success",
        data: {
          content: A,
          total: C,
          readme: x.share.readme || "",
          header: x.share.header || "",
          write: !1,
          write_content_bypass: !1,
          provider: b,
        },
      })
    }
    let { content: d, provider: l, storage: u } = await mt(n, s),
      f = De(t),
      p = await Hr(r),
      h = await Promise.all(
        d.map(async (x) => {
          let _ = `${n}/${x.name}`.replace(/\/{2,}/g, "/"),
            b =
              !x.is_dir && p.enabled
                ? await Lo(r, _, p.expiresIn)
                : x.sign || ""
          return {
            name: x.name,
            size: x.size,
            is_dir: x.is_dir,
            created: x.created || x.modified || new Date().toISOString(),
            modified: x.modified || new Date().toISOString(),
            sign: b,
            thumb: x.thumb || "",
            type: x.type ?? 0,
          }
        }),
      ),
      m = 0
    if (u && ((m = parseInt(u.page_size, 10) || 0), !m && u.addition))
      try {
        let x =
          typeof u.addition == "string" ? JSON.parse(u.addition) : u.addition
        m = parseInt(x?.page_size, 10) || 0
      } catch {}
    let w = a > 0 ? a : m > 0 ? m : 0,
      g = (x) => {
        let _ = x.length
        if (w <= 0) return { content: x, total: _ }
        let S = (Math.max(1, o) - 1) * w,
          A = S + w
        return { content: x.slice(S, A), total: _ }
      },
      { content: y, total: v } = g(h)
    return r.json({
      code: 200,
      message: "success",
      data: {
        content: y,
        total: v,
        readme: "",
        header: "",
        write: f,
        write_content_bypass: !1,
        provider: l,
        page_size: w > 0 ? w : void 0,
      },
    })
  } catch (d) {
    return r.json({ code: 500, message: ie(d), data: null })
  }
})
he.post("/get", async (r) => {
  let e = await r.req.json().catch(() => ({})),
    t = await Y(r)
  if (!(e.path || "/").startsWith("/@s") && (!t || t.disabled))
    return r.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let s = Fe(r),
    n = ue(t, e.path || "/")
  try {
    if (n.startsWith("/@s")) {
      let u = await Jt(n, e.password || "", r.env)
      if (!u.ok) return r.json({ code: 400, message: u.error, data: null })
      if (u.virtualList) {
        let w = n.split("/").filter(Boolean)[1] || "share"
        return r.json({
          code: 200,
          message: "success",
          data: {
            name: w,
            size: 0,
            is_dir: !0,
            modified: new Date().toISOString(),
            sign: "",
            thumb: "",
            type: 1,
            raw_url: "",
            readme: u.share.readme || "",
            header: u.share.header || "",
            provider: "Share",
            related: [],
            write: !1,
            write_content_bypass: !1,
          },
        })
      }
      let f = n.split("/").filter(Boolean)[1] || "",
        { item: p, provider: h } = await jr(u.realPath, s),
        m = n.replace(/^\/@s\/[^/]+/, "")
      return r.json({
        code: 200,
        message: "success",
        data: {
          name: p.name,
          size: p.size,
          is_dir: p.is_dir,
          created: p.created || p.modified || new Date().toISOString(),
          modified: p.modified,
          sign: p.sign || "",
          thumb: p.thumb || "",
          type: p.type ?? 0,
          raw_url: `/api/sd/${f}${m}`,
          readme: u.share.readme || "",
          header: u.share.header || "",
          provider: h,
          related: [],
          write: !1,
          write_content_bypass: !1,
        },
      })
    }
    let { item: o, provider: a, rawUrl: c } = await jr(n, s),
      d = await Hr(r),
      l = !o.is_dir && d.enabled ? await Lo(r, n, d.expiresIn) : o.sign || ""
    return r.json({
      code: 200,
      message: "success",
      data: {
        name: o.name,
        size: o.size,
        is_dir: o.is_dir,
        created: o.created || o.modified || new Date().toISOString(),
        modified: o.modified,
        sign: l,
        thumb: o.thumb || "",
        type: o.type ?? 0,
        raw_url: c,
        readme: "",
        header: "",
        provider: a,
        related: [],
        write: De(t),
        write_content_bypass: !1,
      },
    })
  } catch (o) {
    return r.json({ code: 500, message: ie(o), data: null })
  }
})
he.post("/mkdir", async (r) => {
  let e = await Y(r)
  if (!De(e)) return Ve(r)
  let t = await r.req.json().catch(() => ({})),
    i = ue(e, t.path || "/"),
    s = Fe(r)
  try {
    return (
      await uu(i, s),
      r.json({ code: 200, message: "success", data: null })
    )
  } catch (n) {
    return r.json({ code: 500, message: ie(n), data: null })
  }
})
he.post("/rename", async (r) => {
  let e = await Y(r)
  if (!De(e)) return Ve(r)
  let { path: t, name: i } = await r.req.json().catch(() => ({})),
    s = Fe(r)
  try {
    let n = ue(e, t || "/")
    return (
      await fu(n, i, s),
      r.json({ code: 200, message: "success", data: null })
    )
  } catch (n) {
    return r.json({ code: 500, message: ie(n), data: null })
  }
})
he.post("/remove", async (r) => {
  let e = await Y(r)
  if (!De(e)) return Ve(r)
  let { dir: t, names: i } = await r.req.json().catch(() => ({})),
    s = Fe(r)
  try {
    let n = ue(e, t || "/")
    return (
      await pu(n, i, s),
      r.json({ code: 200, message: "success", data: null })
    )
  } catch (n) {
    return r.json({ code: 500, message: ie(n), data: null })
  }
})
he.post("/move", async (r) => {
  let e = await Y(r)
  if (!De(e)) return Ve(r)
  let {
      src_dir: t,
      dst_dir: i,
      names: s,
    } = await r.req.json().catch(() => ({})),
    n = Fe(r)
  try {
    let o = ue(e, t || "/"),
      a = ue(e, i || "/")
    return (
      await hu(o, a, s, n),
      r.json({ code: 200, message: "success", data: null })
    )
  } catch (o) {
    return r.json({ code: 500, message: ie(o), data: null })
  }
})
he.post("/copy", async (r) => {
  let e = await Y(r)
  if (!De(e)) return Ve(r)
  let {
      src_dir: t,
      dst_dir: i,
      names: s,
    } = await r.req.json().catch(() => ({})),
    n = Fe(r)
  try {
    let o = ue(e, t || "/"),
      a = ue(e, i || "/")
    return (
      await gu(o, a, s, n),
      r.json({ code: 200, message: "success", data: null })
    )
  } catch (o) {
    return r.json({ code: 500, message: ie(o), data: null })
  }
})
he.put("/put", async (r) => {
  let e = await Y(r)
  if (!De(e)) return Ve(r)
  let t = decodeURIComponent(r.req.header("File-Path") || ""),
    i = ue(e, t),
    s = Fe(r)
  try {
    let n = await r.req.arrayBuffer()
    return (
      await vo(i, Buffer.from(n), s),
      r.json({ code: 200, message: "success", data: null })
    )
  } catch (n) {
    return r.json({ code: 500, message: ie(n), data: null })
  }
})
he.put("/form", async (r) => {
  let e = await Y(r)
  if (!De(e)) return Ve(r)
  let t = decodeURIComponent(r.req.header("File-Path") || ""),
    i = ue(e, t),
    s = Fe(r)
  try {
    let o = (await r.req.formData()).get("file")
    if (!o || typeof o == "string")
      return r.json({
        code: 400,
        message: "missing file in form data",
        data: null,
      })
    let a = Buffer.from(await o.arrayBuffer())
    return (
      await vo(i, a, s),
      r.json({ code: 200, message: "success", data: null })
    )
  } catch (n) {
    return r.json({ code: 500, message: ie(n), data: null })
  }
})
he.post("/upload/create", async (r) => {
  let e = await Y(r)
  if (!De(e)) return Ve(r)
  let {
      path: t,
      file_name: i,
      size: s,
      md5: n,
    } = await r.req.json().catch(() => ({})),
    o = ue(e, t || "/"),
    a = Fe(r)
  if (!i)
    return r.json({
      code: 400,
      message: "path and file_name are required",
      data: null,
    })
  try {
    let c = await ne(o)
    if (c.isVirtual) throw new Error("failed get storage: storage not found")
    let d = await ee(c.storage.driver, c.storage)
    if (typeof d.createUploadSession != "function")
      return r.json({ code: 200, message: "success", data: null })
    let l
    try {
      l = await d.createUploadSession(o, c.physical, i, Number(s) || 0, n || "")
    } finally {
      await be(c.storage.driver, c.storage, d, a)
    }
    return r.json({ code: 200, message: "success", data: l })
  } catch (c) {
    return r.json({ code: 500, message: ie(c), data: null })
  }
})
he.put("/upload/part", async (r) => {
  let e = await Y(r)
  if (!De(e)) return Ve(r)
  let t = r.req.header("X-Upload-Session") || "",
    i = parseInt(r.req.header("X-Part-Number") || "0", 10),
    s = decodeURIComponent(r.req.header("Upload-Path") || ""),
    n = ue(e, s),
    o = Fe(r)
  if (!t || !(i >= 1) || !n)
    return r.json({
      code: 400,
      message: "missing X-Upload-Session / X-Part-Number / Upload-Path",
      data: null,
    })
  try {
    let a = await ne(n)
    if (a.isVirtual) throw new Error("failed get storage: storage not found")
    let c = await ee(a.storage.driver, a.storage)
    if (typeof c.uploadPart != "function")
      throw new Error("storage does not support chunked upload")
    let d = Buffer.from(await r.req.arrayBuffer()),
      l
    try {
      l = await c.uploadPart(t, i, d)
    } finally {
      await be(a.storage.driver, a.storage, c, o)
    }
    return r.json({ code: 200, message: "success", data: l ?? null })
  } catch (a) {
    return r.json({ code: 500, message: ie(a), data: null })
  }
})
he.post("/upload/complete", async (r) => {
  let e = await Y(r)
  if (!De(e)) return Ve(r)
  let {
      path: t,
      session: i,
      partMd5s: s,
    } = await r.req.json().catch(() => ({})),
    n = ue(e, t || "/"),
    o = Fe(r)
  if (!i)
    return r.json({
      code: 400,
      message: "path and session are required",
      data: null,
    })
  try {
    let a = await ne(n)
    if (a.isVirtual) throw new Error("failed get storage: storage not found")
    let c = await ee(a.storage.driver, a.storage)
    if (typeof c.completeUploadSession != "function")
      throw new Error("storage does not support chunked upload")
    try {
      await c.completeUploadSession(i, s)
    } finally {
      await be(a.storage.driver, a.storage, c, o)
    }
    return r.json({ code: 200, message: "success", data: null })
  } catch (a) {
    return r.json({ code: 500, message: ie(a), data: null })
  }
})
he.post("/add_offline_download", async (r) => {
  let e = await Y(r)
  if (!e || e.disabled)
    return r.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let { path: t, urls: i } = await r.req.json().catch(() => ({})),
    s = ue(e, t || "/")
  return !i || i.length === 0
    ? r.json({ code: 400, message: "No URLs provided" })
    : r.json({
        code: 200,
        message:
          "Offline download task received (Note: background processing limited in Serverless mode)",
        data: null,
      })
})
he.post("/search", async (r) => {
  let e = await Y(r)
  if (!e || e.disabled)
    return r.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let t = await r.req.json().catch(() => ({})),
    i = ue(e, t.parent || "/")
  try {
    let s = await t0(
      {
        parent: i,
        keywords: t.keywords || "",
        scope: t.scope !== void 0 ? parseInt(t.scope, 10) : 0,
        page: t.page ? parseInt(t.page, 10) : 1,
        per_page: t.per_page ? parseInt(t.per_page, 10) : 30,
      },
      r.env,
    )
    return r.json({ code: 200, message: "success", data: s })
  } catch (s) {
    return r.json({ code: 500, message: ie(s), data: null }, 500)
  }
})
he.post("/other", async (r) => {
  let e = await Y(r)
  if (!e || e.disabled)
    return r.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let t = await r.req.json().catch(() => ({})),
    i = ue(e, t.path || "/"),
    s = t.method
  if (!s)
    return r.json(
      { code: 400, message: "Missing required parameter 'method'", data: null },
      400,
    )
  try {
    let n = await ne(i)
    if (n.isVirtual || !n.storage)
      throw new Error("failed get storage: storage not found")
    let o = await ee(n.storage.driver, n.storage)
    if (typeof o.other == "function") {
      let a = await o.other(s, n.relative, t)
      return r.json({ code: 200, message: "success", data: a })
    }
    return r.json(
      {
        code: 500,
        message: `Driver '${n.storage.driver}' does not support other method '${s}'`,
        data: null,
      },
      500,
    )
  } catch (n) {
    return r.json({ code: 500, message: ie(n), data: null }, 500)
  }
})
Nr()
te()
Ge()
var No = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
function og(r) {
  let e = String(r).toUpperCase().replace(/[\s=]/g, "")
  if (!e) throw new Error("Empty base32 secret")
  let t = [],
    i = 0,
    s = 0
  for (let n of e) {
    let o = No.indexOf(n)
    if (o === -1) throw new Error(`Invalid base32 character: ${n}`)
    ;((i = (i << 5) | o),
      (s += 5),
      s >= 8 && (t.push((i >> (s - 8)) & 255), (s -= 8)))
  }
  return new Uint8Array(t)
}
function ag(r) {
  let e = 0,
    t = 0,
    i = ""
  for (let s = 0; s < r.length; s++)
    for (e = (e << 8) | r[s], t += 8; t >= 5; )
      ((i += No[(e >> (t - 5)) & 31]), (t -= 5))
  return (t > 0 && (i += No[(e << (5 - t)) & 31]), i)
}
function r0(r = 20) {
  let e = new Uint8Array(r)
  return (crypto.getRandomValues(e), ag(e))
}
async function cg(r, e) {
  let t = await crypto.subtle.importKey(
      "raw",
      r,
      { name: "HMAC", hash: "SHA-1" },
      !1,
      ["sign"],
    ),
    i = await crypto.subtle.sign("HMAC", t, e)
  return new Uint8Array(i)
}
async function dg(r, e = Date.now(), t = 30, i = 6) {
  let s = Math.floor(e / 1e3 / t),
    n = new Uint8Array(8),
    o = s
  for (let u = 7; u >= 0; u--) ((n[u] = o & 255), (o = Math.floor(o / 256)))
  let a = await cg(og(r), n),
    c = a[a.length - 1] & 15,
    l =
      (((a[c] & 127) << 24) |
        ((a[c + 1] & 255) << 16) |
        ((a[c + 2] & 255) << 8) |
        (a[c + 3] & 255)) %
      Math.pow(10, i)
  return String(l).padStart(i, "0")
}
async function Mo(r, e, t = 1, i = Date.now()) {
  if (!r || !e) return !1
  let s = String(e).trim()
  if (!/^\d{6}$/.test(s)) return !1
  for (let n = -t; n <= t; n++) if ((await dg(r, i + n * 3e4)) === s) return !0
  return !1
}
function i0(r, e, t = "OpenListNext") {
  let i = encodeURIComponent(`${t}:${e}`),
    s = new URLSearchParams({
      secret: r,
      issuer: t,
      algorithm: "SHA1",
      digits: "6",
      period: "30",
    })
  return `otpauth://totp/${i}?${s.toString()}`
}
function s0(r) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(r)}`
}
te()
function lg(r) {
  let e = ""
  for (let t = 0; t < r.length; t++) e += String.fromCharCode(r[t])
  return btoa(e)
}
function n0(r) {
  let e = String(r || "")
      .replace(/[\s\r\n]/g, "")
      .replace(/-/g, "+")
      .replace(/_/g, "/"),
    t = e.length % 4,
    i = t ? e + "=".repeat(4 - t) : e
  try {
    let s = atob(i),
      n = new Uint8Array(s.length)
    for (let o = 0; o < s.length; o++) n[o] = s.charCodeAt(o)
    return n
  } catch {
    return null
  }
}
var ug = [
  "ssh-rsa",
  "ssh-dss",
  "ssh-ed25519",
  "ecdsa-sha2-nistp256",
  "ecdsa-sha2-nistp384",
  "ecdsa-sha2-nistp521",
  "sk-ssh-ed25519@openssh.com",
  "sk-ecdsa-sha2-nistp256@openssh.com",
  "sk-ssh-ed25519@openssh.com.webauthn",
  "sk-ecdsa-sha2-nistp256@openssh.com.webauthn",
]
function Ho(r) {
  let e = String(r || "")
    .trim()
    .split(/\s+/)
  if (e.length < 2) return null
  let t = e[0]
  if (!ug.includes(t)) return null
  let i = n0(e[1])
  return !i || i.length < 16
    ? null
    : {
        type: t,
        blobBase64: e[1].replace(/[\s\r\n]/g, ""),
        comment: e.slice(2).join(" ") || "",
      }
}
async function o0(r) {
  let e = Ho(r)
  if (!e) return null
  let t = n0(e.blobBase64)
  if (!t) return null
  let i = await crypto.subtle.digest(
      "SHA-256",
      t.buffer.slice(t.byteOffset, t.byteOffset + t.byteLength),
    ),
    s = new Uint8Array(i)
  return "SHA256:" + lg(s).replace(/=+$/, "")
}
function a0() {
  let r = globalThis
  return typeof r.crypto?.randomUUID == "function"
    ? r.crypto.randomUUID()
    : Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 10) +
        Math.random().toString(36).slice(2, 10)
}
async function Yt(r, e) {
  let i = ((await U(e)).users || []).find((s) => s.id === r)
  return i ? i.ssh_keys || [] : []
}
async function c0(r, e, t, i) {
  let s = Ho(e)
  if (!s) throw new Error("Invalid OpenSSH public key format")
  let n = await o0(e)
  if (!n) throw new Error("Failed to compute SSH key fingerprint")
  let o = await U(i),
    a = (o.users || []).find((d) => d.id === r)
  if (!a) throw new Error("User not found")
  if (
    (Array.isArray(a.ssh_keys) || (a.ssh_keys = []),
    a.ssh_keys.some((d) => d.fingerprint === n))
  )
    throw new Error("SSH key with this fingerprint already exists")
  let c = {
    id: a0(),
    name: (t || s.comment || s.type).slice(0, 64),
    public_key: e.trim(),
    fingerprint: n,
    created_at: new Date().toISOString(),
  }
  return (a.ssh_keys.push(c), await $(o, i), c)
}
async function Ys(r, e, t) {
  let i = await U(t),
    s = (i.users || []).find((o) => o.id === r)
  if (!s || !Array.isArray(s.ssh_keys)) return !1
  let n = s.ssh_keys.length
  return (
    (s.ssh_keys = s.ssh_keys.filter((o) => o.id !== e)),
    s.ssh_keys.length !== n ? (await $(i, t), !0) : !1
  )
}
var Qe = new J(),
  Kr = new J(),
  fg = 5,
  pg = 900 * 1e3,
  Bt = new Map()
function hg(r) {
  return (
    r.req.header("CF-Connecting-IP") ||
    r.req.header("x-real-ip") ||
    r.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  )
}
function Ko(r, e) {
  return `${hg(r)}|${String(e || "").toLowerCase()}`
}
function d0(r, e) {
  if (Bt.size > 1e4) {
    let i = Date.now()
    for (let [s, n] of Bt) n.lockedUntil < i && n.count === 0 && Bt.delete(s)
  }
  let t = Bt.get(Ko(r, e))
  return !!t && t.lockedUntil > Date.now()
}
function l0(r, e) {
  let t = Ko(r, e),
    i = Date.now(),
    s = Bt.get(t) || { count: 0, lockedUntil: 0 }
  s.lockedUntil > i ||
    ((s.count += 1),
    s.count >= fg && ((s.lockedUntil = i + pg), (s.count = 0)),
    Bt.set(t, s))
}
function u0(r, e) {
  Bt.delete(Ko(r, e))
}
async function Je(r) {
  let t = new TextEncoder().encode(`${r}-https://github.com/alist-org/alist`),
    i = await crypto.subtle.digest("SHA-256", t)
  return Array.from(new Uint8Array(i))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")
}
async function f0(r) {
  let e = await U(r)
  if (!e.users || e.users.length === 0) {
    let t =
        (r && r.ADMIN_PASSWORD) ||
        (typeof process < "u" ? process.env?.ADMIN_PASSWORD : "") ||
        "",
      i = await Je(t || "admin")
    ;((e.users = [
      {
        id: 1,
        username: "admin",
        password: i,
        role: 2,
        permission: 0,
        base_path: "/",
        disabled: !1,
        sso_id: "",
        allow_ldap: !1,
        pwd_update_at: new Date().toISOString(),
      },
      {
        id: 2,
        username: "guest",
        password: "",
        role: 1,
        permission: 0,
        base_path: "/",
        disabled: !1,
        sso_id: "",
        allow_ldap: !1,
        pwd_update_at: new Date().toISOString(),
      },
    ]),
      await $(e, r))
  } else {
    let t = e.users.find((i) => i.username === "admin")
    if (t && (!t.password || String(t.password).trim() === "")) {
      let i =
        (r && r.ADMIN_PASSWORD) ||
        (typeof process < "u" ? process.env?.ADMIN_PASSWORD : "") ||
        ""
      ;((t.password = await Je(i || "admin")), await $(e, r))
    }
  }
  return { db: e, users: e.users }
}
async function Zt(r) {
  let e = r.req.header("Authorization")
  if (!e) return null
  let t = e.startsWith("Bearer ") ? e.substring(7) : e
  try {
    let i = await Ne(r),
      s = await wt(t, i, "HS256"),
      n = await U(r.env)
    n.users || (n.users = [])
    let o = n.users.find((a) => a.id === s.id || a.username === s.username)
    return o ? { db: n, user: o } : null
  } catch {
    return null
  }
}
async function p0(r, e) {
  if (!r.otp_secret)
    return { ok: !0, code: 200, httpStatus: 200, message: "ok" }
  let t = String(e.otp_code || e.code || "").trim()
  return t
    ? (await Mo(r.otp_secret, t))
      ? { ok: !0, code: 200, httpStatus: 200, message: "ok" }
      : { ok: !1, code: 401, httpStatus: 401, message: "Invalid OTP code" }
    : { ok: !1, code: 402, httpStatus: 200, message: "OTP code required" }
}
Qe.post("/login", async (r) => {
  let e = await r.req.json().catch(() => ({})),
    t = (e.username || "").trim(),
    i = e.password || ""
  if (d0(r, t))
    return r.json(
      {
        code: 429,
        message:
          "Too many failed login attempts for this account/IP, please try again later",
        data: null,
      },
      429,
    )
  let s = await Je(i),
    { users: n } = await f0(r.env),
    o = n.find((a) => a.username === t && !a.disabled)
  if (o) {
    let a = o.password || ""
    if ((a !== "" && a === i) || a === s) {
      let d = await p0(o, e)
      if (!d.ok)
        return r.json(
          { code: d.code, message: d.message, data: null },
          d.httpStatus,
        )
      u0(r, t)
      let l = {
          id: o.id,
          username: o.username,
          role: o.role,
          exp: Math.floor(Date.now() / 1e3) + 3600 * 24 * 7,
        },
        u = await Ne(r),
        f = await Lr(l, u)
      return r.json({ code: 200, message: "success", data: { token: f } })
    }
  }
  return (
    l0(r, t),
    r.json({ code: 401, message: "Invalid credentials", data: null }, 401)
  )
})
Qe.post("/login/hash", async (r) => {
  let e = await r.req.json().catch(() => ({})),
    t = (e.username || "").trim(),
    i = e.password || ""
  if (d0(r, t))
    return r.json(
      {
        code: 429,
        message:
          "Too many failed login attempts for this account/IP, please try again later",
        data: null,
      },
      429,
    )
  let { users: s } = await f0(r.env),
    n = s.find((o) => o.username === t && !o.disabled)
  if (n) {
    let o = n.password || "",
      a = o.length === 64 ? o : await Je(o || "admin")
    if (i === o || i === a) {
      let d = await p0(n, e)
      if (!d.ok)
        return r.json(
          { code: d.code, message: d.message, data: null },
          d.httpStatus,
        )
      u0(r, t)
      let l = {
          id: n.id,
          username: n.username,
          role: n.role,
          exp: Math.floor(Date.now() / 1e3) + 3600 * 24 * 7,
        },
        u = await Ne(r),
        f = await Lr(l, u)
      return r.json({ code: 200, message: "success", data: { token: f } })
    }
  }
  return (
    l0(r, t),
    r.json({ code: 401, message: "Invalid credentials", data: null }, 401)
  )
})
var Wo = async (r) => {
    let e = await Zt(r)
    if (!e)
      return r.json({ code: 401, message: "Unauthorized", data: null }, 401)
    let { db: t, user: i } = e,
      s = await r.req.json().catch(() => ({}))
    if (s.username && s.username.trim() !== "") {
      let n = s.username.trim()
      if (t.users.some((a) => a.id !== i.id && a.username === n))
        return r.json(
          { code: 400, message: "Username already exists", data: null },
          400,
        )
      i.username = n
    }
    return (
      s.password &&
        s.password.trim() !== "" &&
        ((i.password = await Je(s.password.trim())),
        (i.pwd_update_at = new Date().toISOString())),
      await $(t, r.env),
      r.json({ code: 200, message: "success", data: null })
    )
  },
  Go = async (r) => {
    let e = await Y(r)
    return !e || e.disabled
      ? r.json({ code: 401, message: "Unauthorized", data: null }, 401)
      : r.json({
          code: 200,
          message: "success",
          data: {
            id: e.id,
            username: e.username,
            role: e.role,
            permission: e.permission ?? 0,
            base_path: e.base_path || "/",
            disabled: !!e.disabled,
            sso_id: e.sso_id || "",
            allow_ldap: !!e.allow_ldap,
            otp: !!e.otp_secret,
          },
        })
  }
Qe.get("/me", Go)
Qe.post("/me/update", Wo)
var Wr = (r) => r.json({ code: 200, message: "success", data: null })
Qe.get("/logout", Wr)
Qe.post("/logout", Wr)
Qe.post("/2fa/generate", async (r) => {
  let e = await Zt(r)
  if (!e) return r.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let { user: t } = e
  if (t.otp_secret)
    return r.json(
      { code: 400, message: "2FA already enabled", data: null },
      400,
    )
  let i = r0(),
    s = i0(i, t.username)
  return r.json({
    code: 200,
    message: "success",
    data: { qr: s0(s), secret: i },
  })
})
Qe.post("/2fa/verify", async (r) => {
  let e = await Zt(r)
  if (!e) return r.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let { db: t, user: i } = e,
    s = await r.req.json().catch(() => ({})),
    n = String(s.code || "").trim(),
    o = String(s.secret || "").trim()
  return o
    ? /^[A-Z2-7]+$/i.test(o)
      ? (await Mo(o, n))
        ? ((i.otp_secret = o.toUpperCase()),
          await $(t, r.env),
          r.json({ code: 200, message: "success", data: null }))
        : r.json({ code: 400, message: "Invalid code", data: null }, 400)
      : r.json({ code: 400, message: "Invalid secret format", data: null }, 400)
    : r.json(
        { code: 400, message: "Missing secret parameter", data: null },
        400,
      )
})
Kr.get("/sshkey/list", async (r) => {
  let e = await Zt(r)
  if (!e) return r.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let t = await Yt(e.user.id, r.env)
  return r.json({
    code: 200,
    message: "success",
    data: { content: t, total: t.length },
  })
})
Kr.post("/sshkey/add", async (r) => {
  let e = await Zt(r)
  if (!e) return r.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let t = await r.req.json().catch(() => ({}))
  try {
    let i = await c0(
      e.user.id,
      t.key || t.public_key || "",
      t.name || t.title || "",
      r.env,
    )
    return r.json({ code: 200, message: "success", data: i })
  } catch (i) {
    return r.json(
      { code: 400, message: i.message || "Failed to add SSH key", data: null },
      400,
    )
  }
})
Kr.post("/sshkey/delete", async (r) => {
  let e = await Zt(r)
  if (!e) return r.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let t = r.req.query("id")
  if (!t)
    return r.json(
      { code: 400, message: "Missing id parameter", data: null },
      400,
    )
  if (!(await Ys(e.user.id, t, r.env)))
    return r.json({ code: 404, message: "SSH key not found", data: null }, 404)
  let s = await Yt(e.user.id, r.env)
  return r.json({ code: 200, message: "success", data: s })
})
te()
Qs()
Mr()
te()
Nr()
Ge()
var Me = new J()
Me.get("/list", async (r) => {
  let t = ((await U(r.env)).users || []).map((i) => ({
    id: i.id,
    username: i.username,
    role: i.role,
    permission: i.permission ?? 0,
    base_path: i.base_path || "/",
    disabled: !!i.disabled,
    sso_id: i.sso_id || "",
    allow_ldap: !!i.allow_ldap,
    pwd_update_at: i.pwd_update_at || "",
    otp: !!i.otp_secret,
  }))
  return r.json({
    code: 200,
    message: "success",
    data: { content: t, total: t.length },
  })
})
Me.get("/get", async (r) => {
  let e = r.req.query("id")
  if (!e)
    return r.json(
      { code: 400, message: "Missing id parameter", data: null },
      400,
    )
  let t = parseInt(e, 10),
    s = ((await U(r.env)).users || []).find((n) => n.id === t)
  return s
    ? r.json({
        code: 200,
        message: "success",
        data: {
          id: s.id,
          username: s.username,
          password: "",
          role: s.role,
          permission: s.permission ?? 0,
          base_path: s.base_path || "/",
          disabled: !!s.disabled,
          sso_id: s.sso_id || "",
          allow_ldap: !!s.allow_ldap,
          otp: !!s.otp_secret,
        },
      })
    : r.json({ code: 404, message: "User not found", data: null }, 404)
})
Me.post("/create", async (r) => {
  let e = await r.req.json().catch(() => ({}))
  if (!e.username)
    return r.json(
      { code: 400, message: "Username is required", data: null },
      400,
    )
  let t = await U(r.env)
  if (
    (t.users || (t.users = []), t.users.some((d) => d.username === e.username))
  )
    return r.json(
      { code: 400, message: "Username already exists", data: null },
      400,
    )
  let n = t.users.reduce((d, l) => Math.max(d, l.id || 0), 0) + 1,
    o = e.password || "123456",
    a = await Je(o),
    c = {
      id: n,
      username: e.username,
      password: a,
      role: e.role !== void 0 ? parseInt(e.role, 10) : 0,
      permission: e.permission !== void 0 ? parseInt(e.permission, 10) : 0,
      base_path: e.base_path || "/",
      disabled: !!e.disabled,
      sso_id: e.sso_id || "",
      allow_ldap: !!e.allow_ldap,
      pwd_update_at: new Date().toISOString(),
    }
  return (
    t.users.push(c),
    await $(t, r.env),
    r.json({ code: 200, message: "success", data: null })
  )
})
Me.post("/update", async (r) => {
  let e = await r.req.json().catch(() => ({}))
  if (!e.id)
    return r.json(
      { code: 400, message: "User ID is required", data: null },
      400,
    )
  let t = parseInt(e.id, 10),
    i = await U(r.env)
  i.users || (i.users = [])
  let s = i.users.findIndex((o) => o.id === t)
  if (s === -1)
    return r.json({ code: 404, message: "User not found", data: null }, 404)
  let n = i.users[s]
  if (e.username && e.username !== n.username) {
    if (i.users.some((a) => a.id !== t && a.username === e.username))
      return r.json(
        { code: 400, message: "Username already in use", data: null },
        400,
      )
    n.username = e.username
  }
  return (
    e.password &&
      e.password.trim() !== "" &&
      ((n.password = await Je(e.password)),
      (n.pwd_update_at = new Date().toISOString())),
    e.role !== void 0 && (n.role = parseInt(e.role, 10)),
    e.permission !== void 0 && (n.permission = parseInt(e.permission, 10)),
    e.base_path !== void 0 && (n.base_path = e.base_path),
    e.disabled !== void 0 && (n.disabled = !!e.disabled),
    e.sso_id !== void 0 && (n.sso_id = e.sso_id),
    e.allow_ldap !== void 0 && (n.allow_ldap = !!e.allow_ldap),
    (i.users[s] = n),
    await $(i, r.env),
    r.json({ code: 200, message: "success", data: null })
  )
})
var h0 = async (r) => {
  let e = r.req.query("id")
  if (!e)
    return r.json(
      { code: 400, message: "Missing id parameter", data: null },
      400,
    )
  let t = parseInt(e, 10)
  if (t === 1)
    return r.json(
      { code: 400, message: "Cannot delete primary admin user", data: null },
      400,
    )
  let i = await U(r.env)
  return (
    i.users || (i.users = []),
    (i.users = i.users.filter((s) => s.id !== t)),
    await $(i, r.env),
    r.json({ code: 200, message: "success", data: null })
  )
}
Me.post("/delete", h0)
Me.post("/cancel", h0)
Me.get("/sshkey/list", async (r) => {
  let e = parseInt(r.req.query("uid") || "0", 10),
    t = await Yt(e, r.env)
  return r.json({
    code: 200,
    message: "success",
    data: { content: t, total: t.length },
  })
})
Me.post("/sshkey/delete", async (r) => {
  let e = parseInt(r.req.query("uid") || "0", 10),
    t = r.req.query("id")
  if (!e || !t)
    return r.json(
      { code: 400, message: "Missing uid or id parameter", data: null },
      400,
    )
  if (!(await Ys(e, t, r.env)))
    return r.json({ code: 404, message: "SSH key not found", data: null }, 404)
  let s = await Yt(e, r.env)
  return r.json({ code: 200, message: "success", data: s })
})
Me.post("/cancel_2fa", async (r) => {
  let e = parseInt(r.req.query("id") || "0", 10)
  if (!e)
    return r.json(
      { code: 400, message: "Missing id parameter", data: null },
      400,
    )
  let t = await U(r.env),
    i = (t.users || []).find((s) => s.id === e)
  return i
    ? (delete i.otp_secret,
      await $(t, r.env),
      r.json({ code: 200, message: "success", data: null }))
    : r.json({ code: 404, message: "User not found", data: null }, 404)
})
var g0 = async (r) => {
  let e = r.req.header("Authorization")
  if (!e) return r.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let t = e.startsWith("Bearer ") ? e.substring(7) : e
  try {
    let i = await Ne(r),
      s = await wt(t, i, "HS256"),
      n = await r.req.json().catch(() => ({})),
      o = n.old_password || "",
      a = n.new_password || ""
    if (!a)
      return r.json(
        { code: 400, message: "New password is required", data: null },
        400,
      )
    let c = await U(r.env)
    c.users || (c.users = [])
    let d = c.users.findIndex((f) => f.id === s.id || f.username === s.username)
    if (d === -1)
      return r.json({ code: 404, message: "User not found", data: null }, 404)
    let l = c.users[d],
      u = await Je(o)
    return l.password && l.password !== o && l.password !== u
      ? r.json(
          { code: 400, message: "Incorrect old password", data: null },
          400,
        )
      : ((l.password = await Je(a)),
        (l.pwd_update_at = new Date().toISOString()),
        (c.users[d] = l),
        await $(c, r.env),
        r.json({ code: 200, message: "success", data: null }))
  } catch (i) {
    return r.json(
      {
        code: 401,
        message: `Unauthorized: ${i.message || "Invalid token"}`,
        data: null,
      },
      401,
    )
  }
}
var z = new J()
z.use("*", async (r, e) => {
  if (!(await Tt(r)))
    return r.json({ code: 401, message: "Unauthorized", data: null })
  await e()
})
z.get("/storage/list", async (r) => {
  let e = await U(r.env)
  return r.json({
    code: 200,
    message: "success",
    data: { content: e.storages, total: e.storages.length },
  })
})
z.post("/storage/load_all", async (r) => {
  let e = await U(r.env),
    t = [],
    i = 0,
    s = 0
  for (let n of e.storages || [])
    if (!n.disabled)
      try {
        ;(await ee(n.driver, n),
          i++,
          t.push({
            id: n.id,
            mount_path: n.mount_path,
            driver: n.driver,
            status: "ok",
          }))
      } catch (o) {
        ;(s++,
          t.push({
            id: n.id,
            mount_path: n.mount_path,
            driver: n.driver,
            status: "failed",
            error: o?.message || String(o),
          }))
      }
  return r.json({
    code: 200,
    message: "success",
    data: { loaded: i, failed: s, results: t },
  })
})
z.get("/storage/get", async (r) => {
  let e = parseInt(r.req.query("id") || "0", 10),
    i = (await U(r.env)).storages.find((s) => s.id === e)
  return i
    ? r.json({ code: 200, message: "success", data: i })
    : r.json({ code: 404, message: "storage not found", data: null })
})
var m0 = (r) => {
    let e = (r || "").toLowerCase().replace(/[^a-z0-9]/g, "")
    if (!e) return ""
    let i = Object.keys(Zs).find(
      (s) =>
        s.toLowerCase() === e ||
        s.toLowerCase().replace(/[^a-z0-9]/g, "") === e,
    )
    return (
      i ||
      (e.startsWith("115")
        ? "115Open"
        : e.startsWith("123")
          ? "123Pan"
          : e.includes("aliyun")
            ? "AliyundriveOpen"
            : e.startsWith("baidu")
              ? "BaiduNetdisk"
              : e.startsWith("189") ||
                  e.includes("cloud189") ||
                  e.includes("ctyun")
                ? "Cloud189"
                : e === "onedriveapp"
                  ? "OnedriveAPP"
                  : e.startsWith("onedrive")
                    ? "Onedrive"
                    : e.startsWith("google") || e.includes("gdrive")
                      ? "GoogleDrive"
                      : (e.includes("thunder") || e.includes("xunlei")) &&
                          e.includes("expert")
                        ? "ThunderExpert"
                        : e.includes("thunder") || e.includes("xunlei")
                          ? "Thunder"
                          : e === "webdav" || e === "webdavdriver"
                            ? "WebDav"
                            : e === "wopan" ||
                                e.includes("unicom") ||
                                e.includes("woyun")
                              ? "WoPan"
                              : e === "quark" || e === "quarkuc" || e === "uc"
                                ? "Quark"
                                : [
                                      "s3",
                                      "doge",
                                      "dogecloud",
                                      "minio",
                                      "ceph",
                                      "aws",
                                      "r2",
                                      "b2",
                                      "cos",
                                      "oss",
                                      "kodo",
                                    ].includes(e)
                                  ? "S3"
                                  : e.startsWith("github")
                                    ? "Github"
                                    : e === "local"
                                      ? "Local"
                                      : r || "")
    )
  },
  y0 = (r, e) => {
    let t = ""
    if (typeof e == "object" && e !== null)
      try {
        t = JSON.stringify(e)
      } catch {
        t = "{}"
      }
    else t = String(e || "{}")
    let i = (r || "").toLowerCase()
    if (i.includes("thunder") || i.includes("xunlei"))
      try {
        let s = JSON.parse(t || "{}")
        if (
          !s.device_id ||
          typeof s.device_id != "string" ||
          s.device_id.trim().length !== 32
        ) {
          let n =
            typeof crypto < "u" && typeof crypto.randomUUID == "function"
              ? crypto.randomUUID().replace(/-/g, "")
              : Math.random().toString(16).substring(2).padEnd(16, "0") +
                Math.random().toString(16).substring(2).padEnd(16, "0")
          return ((s.device_id = n.slice(0, 32)), JSON.stringify(s))
        }
      } catch {}
    return t
  }
z.post("/storage/create", async (r) => {
  let e = await r.req.json().catch(() => ({})),
    t = await U(r.env)
  if (
    !e.driver ||
    typeof e.driver != "string" ||
    e.driver.trim() === "" ||
    e.driver === "undefined" ||
    e.driver === "null"
  )
    return r.json(
      { code: 400, message: "Storage driver is required", data: null },
      400,
    )
  let i = String(e.mount_path || "").trim()
  if (i === "")
    return r.json(
      { code: 400, message: "Mount path is required", data: null },
      400,
    )
  let s = "/" + i.split("/").filter(Boolean).join("/")
  if (
    t.storages.some(
      (c) =>
        "/" + (c.mount_path || "").split("/").filter(Boolean).join("/") === s,
    )
  )
    return r.json({
      code: 400,
      message: "mount path already exists",
      data: null,
    })
  let n = m0(e.driver),
    o = y0(n, e.addition || "{}"),
    a = {
      ...e,
      driver: n,
      addition: o,
      mount_path: s,
      id: t.storages.length ? Math.max(...t.storages.map((c) => c.id)) + 1 : 1,
      status: "work",
      modified: new Date().toISOString(),
    }
  if (!a.disabled)
    try {
      ;(await (await ee(a.driver, a)).init?.(), (a.status = "work"))
    } catch (c) {
      return (
        (a.status = c.message || String(c)),
        String(c.message || c).includes("unsupported driver") &&
          (a.disabled = !0),
        t.storages.push(a),
        await $(t, r.env),
        r.json({ code: 500, message: c.message || String(c), data: a })
      )
    }
  return (
    t.storages.push(a),
    await $(t, r.env),
    r.json({ code: 200, message: "success", data: a })
  )
})
z.post("/storage/update", async (r) => {
  let e = await r.req.json().catch(() => ({})),
    t = await U(r.env),
    i = String(e.mount_path || "").trim(),
    s = i !== "" ? "/" + i.split("/").filter(Boolean).join("/") : void 0
  if (
    s &&
    t.storages.some(
      (o) =>
        o.id !== e.id &&
        "/" + (o.mount_path || "").split("/").filter(Boolean).join("/") === s,
    )
  )
    return r.json({
      code: 400,
      message: "mount path already exists",
      data: null,
    })
  let n = t.storages.findIndex((o) => o.id === e.id)
  if (n !== -1) {
    let o = e.driver || t.storages[n].driver,
      a = m0(o),
      c = y0(
        a,
        e.addition !== void 0 ? e.addition : t.storages[n].addition || "{}",
      ),
      d = {
        ...t.storages[n],
        ...e,
        driver: a,
        addition: c,
        mount_path: s || t.storages[n].mount_path,
        modified: new Date().toISOString(),
      }
    if (!d.disabled)
      try {
        ;(await (await ee(d.driver, d)).init?.(), (d.status = "work"))
      } catch (l) {
        return (
          (d.status = l.message || String(l)),
          String(l.message || l).includes("unsupported driver") &&
            (d.disabled = !0),
          (t.storages[n] = d),
          await $(t, r.env),
          r.json({
            code: 500,
            message: l.message || String(l),
            data: { id: d.id },
          })
        )
      }
    ;((t.storages[n] = d), await $(t, r.env))
  }
  return r.json({ code: 200, message: "success", data: null })
})
z.post("/storage/delete", async (r) => {
  let e = parseInt(r.req.query("id") || "0", 10),
    t = await U(r.env)
  return (
    (t.storages = t.storages.filter((i) => i.id !== e)),
    await $(t, r.env),
    r.json({ code: 200, message: "success", data: null })
  )
})
z.post("/storage/enable", async (r) => {
  let e = parseInt(r.req.query("id") || "0", 10),
    t = await U(r.env),
    i = t.storages.find((s) => s.id === e)
  if (i) {
    ;((i.disabled = !1), (i.modified = new Date().toISOString()))
    try {
      ;(await (await ee(i.driver, i)).init?.(), (i.status = "work"))
    } catch (s) {
      return (
        (i.status = s.message || String(s)),
        await $(t, r.env),
        r.json({ code: 500, message: s.message || String(s), data: null })
      )
    }
    await $(t, r.env)
  }
  return r.json({ code: 200, message: "success", data: null })
})
z.post("/storage/disable", async (r) => {
  let e = parseInt(r.req.query("id") || "0", 10),
    t = await U(r.env),
    i = t.storages.find((s) => s.id === e)
  return (
    i && ((i.disabled = !0), await $(t, r.env)),
    r.json({ code: 200, message: "success", data: null })
  )
})
z.get("/driver/names", (r) =>
  r.json({
    code: 200,
    message: "success",
    data: [
      "AliyundriveOpen",
      "GoogleDrive",
      "Onedrive",
      "OnedriveAPP",
      "Quark",
      "123Pan",
      "BaiduNetdisk",
      "115Open",
      "GitHub API",
      "Thunder",
      "ThunderExpert",
      "189Cloud",
      "WoPan",
      "Lanzou",
      "WebDav",
      "S3",
      "Doge",
    ],
  }),
)
var de = [
    { name: "mount_path", type: "string", default: "", required: !0 },
    { name: "order", type: "number", default: "0", required: !1 },
    { name: "remark", type: "string", default: "", required: !1 },
    { name: "cache_expiration", type: "number", default: "30", required: !1 },
    { name: "web_proxy", type: "bool", default: "false", required: !1 },
    {
      name: "webdav_policy",
      type: "select",
      options: "302_redirect,use_proxy_url,native_proxy",
      default: "302_redirect",
      required: !1,
    },
    { name: "down_proxy_url", type: "string", default: "", required: !1 },
  ],
  Zs = {
    AliyundriveOpen: {
      name: "AliyundriveOpen",
      default_mount_path: "/aliyundrive",
      common: de,
      additional: [
        {
          name: "refresh_token",
          type: "text",
          default: "",
          required: !0,
          help: "true",
        },
        {
          name: "drive_type",
          type: "select",
          options: "resource,backup,default",
          default: "resource",
          required: !0,
        },
        { name: "drive_id", type: "string", default: "", required: !1 },
        {
          name: "root_folder_id",
          type: "string",
          default: "root",
          required: !0,
        },
        {
          name: "order_by",
          type: "select",
          options: "updated_at,name,size,created_at",
          default: "updated_at",
          required: !1,
        },
        {
          name: "order_direction",
          type: "select",
          options: "DESC,ASC",
          default: "DESC",
          required: !1,
        },
        {
          name: "api_url_address",
          type: "string",
          default: "https://api.oplist.org/alicloud/renewapi",
          required: !1,
          help: "true",
        },
        {
          name: "alipan_type",
          type: "select",
          options: "alipanQR,alipanTV",
          default: "alipanQR",
          required: !1,
        },
        { name: "client_id", type: "string", default: "", required: !1 },
        { name: "client_secret", type: "string", default: "", required: !1 },
        {
          name: "remove_way",
          type: "select",
          options: "trash,delete",
          default: "trash",
          required: !1,
        },
      ],
      config: {
        name: "AliyundriveOpen",
        local_sort: !0,
        only_local: !1,
        only_proxy: !1,
        no_cache: !1,
        no_upload: !1,
        need_ms: !1,
        default_root: "root",
      },
    },
    Onedrive: {
      name: "Onedrive",
      default_mount_path: "/onedrive",
      common: de.slice(0, 3),
      additional: [
        {
          name: "root_folder_path",
          type: "string",
          default: "/",
          required: !0,
        },
        {
          name: "region",
          type: "select",
          options: "global,cn,us,de",
          default: "global",
          required: !0,
        },
        { name: "is_sharepoint", type: "bool", default: "false", required: !1 },
        { name: "use_online_api", type: "bool", default: "true", required: !1 },
        {
          name: "api_url_address",
          type: "string",
          default: "https://api.oplist.org/onedrive/renewapi",
          required: !1,
        },
        { name: "client_id", type: "string", default: "", required: !1 },
        { name: "client_secret", type: "string", default: "", required: !1 },
        {
          name: "redirect_uri",
          type: "string",
          default: "https://api.oplist.org/onedrive/callback",
          required: !0,
        },
        { name: "refresh_token", type: "string", default: "", required: !0 },
        { name: "site_id", type: "string", default: "", required: !1 },
        { name: "chunk_size", type: "number", default: "5", required: !1 },
        {
          name: "custom_host",
          type: "string",
          default: "",
          required: !1,
          help: "true",
        },
        {
          name: "disable_disk_usage",
          type: "bool",
          default: "false",
          required: !1,
          help: "true",
        },
        {
          name: "enable_direct_upload",
          type: "bool",
          default: "false",
          required: !1,
          help: "true",
        },
        {
          name: "order_by",
          type: "select",
          options: "filename,modified_time,size",
          default: "filename",
          required: !1,
        },
        {
          name: "order_direction",
          type: "select",
          options: "asc,desc",
          default: "asc",
          required: !1,
        },
      ],
      config: {
        name: "Onedrive",
        local_sort: !0,
        only_local: !1,
        only_proxy: !1,
        no_cache: !1,
        no_upload: !1,
        need_ms: !1,
        default_root: "/",
      },
    },
    OnedriveAPP: {
      name: "OnedriveAPP",
      default_mount_path: "/onedrive_app",
      common: de.slice(0, 3),
      additional: [
        {
          name: "root_folder_path",
          type: "string",
          default: "/",
          required: !0,
        },
        {
          name: "region",
          type: "select",
          options: "global,cn,us,de",
          default: "global",
          required: !0,
        },
        { name: "client_id", type: "string", default: "", required: !0 },
        { name: "client_secret", type: "string", default: "", required: !0 },
        { name: "tenant_id", type: "string", default: "", required: !0 },
        { name: "email", type: "string", default: "", required: !0 },
        { name: "chunk_size", type: "number", default: "5", required: !1 },
        {
          name: "custom_host",
          type: "string",
          default: "",
          required: !1,
          help: "true",
        },
        {
          name: "disable_disk_usage",
          type: "bool",
          default: "false",
          required: !1,
          help: "true",
        },
        {
          name: "enable_direct_upload",
          type: "bool",
          default: "false",
          required: !1,
          help: "true",
        },
        {
          name: "order_by",
          type: "select",
          options: "filename,modified_time,size",
          default: "filename",
          required: !1,
        },
        {
          name: "order_direction",
          type: "select",
          options: "asc,desc",
          default: "asc",
          required: !1,
        },
      ],
      config: {
        name: "OnedriveAPP",
        local_sort: !0,
        only_local: !1,
        only_proxy: !1,
        no_cache: !1,
        no_upload: !1,
        need_ms: !1,
        default_root: "/",
      },
    },
    GoogleDrive: {
      name: "GoogleDrive",
      default_mount_path: "/google-drive",
      common: de,
      additional: [
        {
          name: "refresh_token",
          type: "text",
          default: "",
          required: !0,
          help: "true",
        },
        {
          name: "root_folder_id",
          type: "string",
          default: "root",
          required: !1,
        },
        {
          name: "order_by",
          type: "select",
          options: "folder,name,modifiedTime desc",
          default: "folder,name,modifiedTime desc",
          required: !1,
        },
        {
          name: "order_direction",
          type: "select",
          options: "asc,desc",
          default: "asc",
          required: !1,
        },
        {
          name: "api_url_address",
          type: "string",
          default: "https://api.alist.nn.ci/googledrive/token",
          required: !1,
          help: "true",
        },
        { name: "use_online_api", type: "bool", default: "true", required: !1 },
        { name: "client_id", type: "string", default: "", required: !1 },
        { name: "client_secret", type: "string", default: "", required: !1 },
        { name: "chunk_size", type: "number", default: "5", required: !1 },
      ],
      config: {
        name: "GoogleDrive",
        local_sort: !0,
        only_local: !1,
        only_proxy: !1,
        no_cache: !1,
        no_upload: !1,
        need_ms: !1,
        default_root: "root",
      },
    },
    Quark: {
      name: "Quark",
      default_mount_path: "/quark",
      common: de,
      additional: [
        {
          name: "variant",
          type: "select",
          options: "Quark,UC",
          default: "Quark",
          required: !0,
        },
        {
          name: "cookie",
          type: "text",
          default: "",
          required: !0,
          help: "true",
        },
        { name: "root_folder_id", type: "string", default: "0", required: !0 },
        {
          name: "order_by",
          type: "select",
          options: "none,file_type,file_name,updated_at",
          default: "none",
          required: !1,
        },
        {
          name: "order_direction",
          type: "select",
          options: "asc,desc",
          default: "asc",
          required: !1,
        },
        {
          name: "use_transcoding_address",
          type: "bool",
          default: "false",
          required: !1,
        },
        {
          name: "only_list_video_file",
          type: "bool",
          default: "false",
          required: !1,
        },
      ],
      config: {
        name: "Quark",
        local_sort: !0,
        only_local: !1,
        only_proxy: !1,
        no_cache: !1,
        no_upload: !1,
        need_ms: !1,
        default_root: "0",
      },
    },
    "123Pan": {
      name: "123Pan",
      default_mount_path: "/123",
      common: de,
      additional: [
        { name: "username", type: "string", default: "", required: !0 },
        { name: "password", type: "string", default: "", required: !0 },
        {
          name: "access_token",
          type: "string",
          default: "",
          required: !1,
          help: "\u767B\u5F55\u4EE4\u724C\uFF08\u53EF\u9009\uFF0C\u81EA\u52A8\u6301\u4E45\u5316\uFF0C\u65E0\u9700\u624B\u52A8\u586B\u5199\uFF09\u3002\u4EC5\u9700\u586B\u5199\u4E0A\u65B9 123 \u7F51\u76D8\u624B\u673A\u53F7\u548C\u5BC6\u7801\uFF0C\u767B\u5F55\u540E\u81EA\u52A8\u83B7\u53D6\u5E76\u4FDD\u5B58\uFF0C\u8DF3\u8FC7\u91CD\u590D\u767B\u5F55\u53EF\u907F\u514D\u5883\u5916 IP \u89E6\u53D1\u98CE\u63A7\u3002",
        },
        {
          name: "cookie",
          type: "text",
          default: "",
          required: !1,
          help: "\u6D4F\u89C8\u5668 Cookie\uFF08\u53EF\u9009\uFF09\u3002\u5728 123 \u7F51\u76D8\u7F51\u9875\u767B\u5F55\u540E\uFF0C\u4ECE\u5F00\u53D1\u8005\u5DE5\u5177\u590D\u5236\u8BF7\u6C42\u5934\u4E2D\u7684 Cookie \u6574\u4E32\u7C98\u8D34\u4E8E\u6B64\uFF08\u542B sso-token\uFF09\uFF0C\u6216\u4ECE Authorization: Bearer <token> \u4E2D\u590D\u5236 token/Bearer \u503C\u3002\u89E3\u6790\u51FA\u7684 JWT \u4F1A\u4F5C\u4E3A Bearer \u4EE4\u724C\u4F7F\u7528\uFF0C\u6548\u679C\u7B49\u540C\u8BBF\u95EE\u4EE4\u724C\uFF0C\u9002\u5408\u8D26\u53F7\u5BC6\u7801\u767B\u5F55\u88AB\u98CE\u63A7\u62E6\u622A\u7684\u73AF\u5883\u3002",
        },
        { name: "root_id", type: "string", default: "0", required: !1 },
        {
          name: "upload_thread",
          type: "number",
          default: "3",
          required: !1,
          help: "the threads of upload",
        },
        {
          name: "platform",
          type: "string",
          default: "web",
          required: !1,
          help: "the platform header value, sent with API requests",
        },
        {
          name: "order_by",
          type: "select",
          options: "file_id,file_name,size,created_at,updated_at",
          default: "file_id",
          required: !1,
        },
        {
          name: "order_direction",
          type: "select",
          options: "asc,desc",
          default: "desc",
          required: !1,
        },
      ],
      config: {
        name: "123Pan",
        local_sort: !0,
        only_local: !1,
        only_proxy: !0,
        no_cache: !1,
        no_upload: !1,
        need_ms: !1,
        default_root: "0",
      },
    },
    BaiduNetdisk: {
      name: "BaiduNetdisk",
      default_mount_path: "/baidu",
      common: de,
      additional: [
        {
          name: "refresh_token",
          type: "text",
          default: "",
          required: !0,
          help: "true",
        },
        {
          name: "access_token",
          type: "string",
          default: "",
          required: !0,
          help: "\u8BBF\u95EE\u4EE4\u724C\uFF08\u5FC5\u586B\uFF09\u3002\u901A\u8FC7 https://api.oplist.org/ \u83B7\u53D6\u3002\u82E5\u4EE4\u724C\u5931\u6548\uFF0C\u6302\u8F7D\u65F6\u4F1A\u81EA\u52A8\u6839\u636E refresh_token \u901A\u8FC7\u5728\u7EBF API \u6362\u65B0\u5E76\u6301\u4E45\u5316\u3002",
        },
        {
          name: "use_online_api",
          type: "bool",
          default: "true",
          required: !1,
          help: "\u4F7F\u7528\u5728\u7EBF API \u5237\u65B0 token\uFF08\u65E0\u9700 ClientID/ClientSecret\uFF09",
        },
        {
          name: "api_url_address",
          type: "string",
          default: "https://api.oplist.org/baiduyun/renewapi",
          required: !1,
        },
        { name: "client_id", type: "string", default: "", required: !1 },
        { name: "client_secret", type: "string", default: "", required: !1 },
        {
          name: "download_api",
          type: "select",
          options: "official,crack,crack_video",
          default: "official",
          required: !1,
        },
        {
          name: "custom_crack_ua",
          type: "string",
          default: "netdisk",
          required: !0,
        },
        {
          name: "order_by",
          type: "select",
          options: "name,time,size",
          default: "name",
          required: !1,
        },
        {
          name: "order_direction",
          type: "select",
          options: "asc,desc",
          default: "asc",
          required: !1,
        },
        {
          name: "only_list_video_file",
          type: "bool",
          default: "false",
          required: !1,
        },
        {
          name: "upload_thread",
          type: "string",
          default: "3",
          required: !1,
          help: "1<=thread<=32",
        },
        {
          name: "upload_timeout",
          type: "number",
          default: "60",
          required: !1,
          help: "per-slice upload timeout in seconds",
        },
        {
          name: "custom_upload_part_size",
          type: "number",
          default: "0",
          required: !1,
          help: "0 for auto",
        },
        {
          name: "use_dynamic_upload_api",
          type: "bool",
          default: "true",
          required: !1,
          help: "dynamically get upload api domain, when enabled, the 'Upload API' setting will be used as a fallback if failed to get",
        },
        {
          name: "upload_api",
          type: "string",
          default: "https://d.pcs.baidu.com",
          required: !1,
        },
        {
          name: "low_bandwith_upload_mode",
          type: "bool",
          default: "false",
          required: !1,
        },
      ],
      config: {
        name: "BaiduNetdisk",
        local_sort: !0,
        only_local: !1,
        only_proxy: !0,
        no_cache: !1,
        no_upload: !1,
        need_ms: !1,
        default_root: "/",
      },
    },
    "115Open": {
      name: "115Open",
      default_mount_path: "/115",
      common: de,
      additional: [
        {
          name: "access_token",
          type: "string",
          default:
            "e4mvi.43f51ee687247d07f386048e903ae6b7.3a9175e14e8e4b254ab81462866f9111e2bdc9984324da30a2b8e2bdfad74ff1",
          required: !0,
          help: "\u8BBF\u95EE\u4EE4\u724C\uFF08\u5FC5\u586B\uFF09\u3002\u901A\u8FC7 115 \u5F00\u653E\u5E73\u53F0\u83B7\u53D6\uFF1B\u5931\u6548\u65F6\u81EA\u52A8\u7528 refresh_token \u5237\u65B0\u5E76\u6301\u4E45\u5316\u3002",
        },
        {
          name: "refresh_token",
          type: "string",
          default: "",
          required: !0,
          help: "\u5237\u65B0\u4EE4\u724C\uFF08\u5FC5\u586B\uFF09\u3002\u901A\u8FC7 115 \u5F00\u653E\u5E73\u53F0\u83B7\u53D6\uFF1Baccess_token \u5931\u6548\u65F6\u81EA\u52A8\u5237\u65B0\u3002",
        },
        {
          name: "root_id",
          type: "string",
          default: "0",
          required: !1,
          help: "\u6839\u6587\u4EF6\u5939 ID\uFF0C\u9ED8\u8BA4 0\uFF08\u6839\u76EE\u5F55\uFF09",
        },
        {
          name: "order_by",
          type: "select",
          options: "file_name,file_size,user_utime,file_type",
          default: "file_name",
          required: !1,
        },
        {
          name: "order_direction",
          type: "select",
          options: "asc,desc",
          default: "asc",
          required: !1,
        },
        {
          name: "page_size",
          type: "number",
          default: "200",
          required: !1,
          help: "list api per page size (1~1150)",
        },
        {
          name: "limit_rate",
          type: "float",
          default: "1",
          required: !1,
          help: "limit all api request rate ([limit]r/1s)\uFF0C0 \u8868\u793A\u4E0D\u9650\u901F",
        },
      ],
      config: {
        name: "115Open",
        local_sort: !0,
        only_local: !1,
        only_proxy: !0,
        no_cache: !1,
        no_upload: !1,
        need_ms: !1,
        default_root: "0",
      },
    },
    "GitHub API": {
      name: "GitHub API",
      default_mount_path: "/github",
      common: de,
      additional: [
        {
          name: "root_folder_path",
          type: "string",
          default: "/",
          required: !0,
        },
        { name: "token", type: "string", default: "", required: !0 },
        { name: "owner", type: "string", default: "", required: !0 },
        { name: "repo", type: "string", default: "", required: !0 },
        {
          name: "ref",
          type: "string",
          default: "",
          required: !1,
          help: "A branch, a tag or a commit SHA, default branch by default.",
        },
        {
          name: "gh_proxy",
          type: "string",
          default: "",
          required: !1,
          help: "GitHub proxy, e.g. https://ghproxy.net/raw.githubusercontent.com",
        },
        { name: "committer_name", type: "string", default: "", required: !1 },
        { name: "committer_email", type: "string", default: "", required: !1 },
        { name: "author_name", type: "string", default: "", required: !1 },
        { name: "author_email", type: "string", default: "", required: !1 },
        {
          name: "mkdir_commit_message",
          type: "text",
          default: "{{.UserName}} mkdir {{.ObjPath}}",
          required: !1,
        },
        {
          name: "delete_commit_message",
          type: "text",
          default: "{{.UserName}} remove {{.ObjPath}}",
          required: !1,
        },
        {
          name: "put_commit_message",
          type: "text",
          default: "{{.UserName}} upload {{.ObjPath}}",
          required: !1,
        },
        {
          name: "rename_commit_message",
          type: "text",
          default: "{{.UserName}} rename {{.ObjPath}} to {{.TargetName}}",
          required: !1,
        },
        {
          name: "copy_commit_message",
          type: "text",
          default: "{{.UserName}} copy {{.ObjPath}} to {{.TargetPath}}",
          required: !1,
        },
        {
          name: "move_commit_message",
          type: "text",
          default: "{{.UserName}} move {{.ObjPath}} to {{.TargetPath}}",
          required: !1,
        },
        {
          name: "order_by",
          type: "select",
          options: "name,size,modified",
          default: "name",
          required: !1,
        },
        {
          name: "order_direction",
          type: "select",
          options: "asc,desc",
          default: "asc",
          required: !1,
        },
      ],
      config: {
        name: "GitHub API",
        local_sort: !0,
        only_local: !1,
        only_proxy: !1,
        no_cache: !1,
        no_upload: !1,
        need_ms: !1,
        default_root: "/",
      },
    },
    Thunder: {
      name: "Thunder",
      default_mount_path: "/thunder",
      common: de,
      additional: [
        { name: "root_folder_id", type: "string", default: "", required: !1 },
        { name: "username", type: "string", default: "", required: !0 },
        { name: "password", type: "string", default: "", required: !0 },
        { name: "captcha_token", type: "string", default: "", required: !1 },
        {
          name: "credit_key",
          type: "string",
          default: "",
          required: !1,
          help: "credit key, used for login",
        },
        {
          name: "device_id",
          type: "string",
          default: "",
          required: !1,
          help: "32 hex characters",
        },
        {
          name: "space",
          type: "string",
          default: "",
          required: !1,
          help: "device id for remote device",
        },
        {
          name: "order_by",
          type: "select",
          options: "name,size,modified",
          default: "name",
          required: !1,
        },
        {
          name: "order_direction",
          type: "select",
          options: "asc,desc",
          default: "asc",
          required: !1,
        },
      ],
      config: {
        name: "Thunder",
        local_sort: !0,
        only_local: !1,
        only_proxy: !1,
        no_cache: !1,
        no_upload: !1,
        need_ms: !1,
        default_root: "",
      },
    },
    ThunderExpert: {
      name: "ThunderExpert",
      default_mount_path: "/thunderexpert",
      common: de,
      additional: [
        { name: "root_folder_id", type: "string", default: "", required: !1 },
        {
          name: "login_type",
          type: "select",
          options: "user,refresh_token",
          default: "user",
          required: !0,
        },
        {
          name: "sign_type",
          type: "select",
          options: "algorithms,captcha_sign",
          default: "algorithms",
          required: !0,
        },
        {
          name: "username",
          type: "string",
          default: "",
          required: !1,
          help: "login type is user, this is required",
        },
        {
          name: "password",
          type: "string",
          default: "",
          required: !1,
          help: "login type is user, this is required",
        },
        {
          name: "refresh_token",
          type: "string",
          default: "",
          required: !1,
          help: "login type is refresh_token, this is required",
        },
        {
          name: "algorithms",
          type: "string",
          default:
            "9uJNVj/wLmdwKrJaVj/omlQ,Oz64Lp0GigmChHMf/6TNfxx7O9PyopcczMsnf,Eb+L7Ce+Ej48u,jKY0,ASr0zCl6v8W4aidjPK5KHd1Lq3t+vBFf41dqv5+fnOd,wQlozdg6r1qxh0eRmt3QgNXOvSZO6q/GXK,gmirk+ciAvIgA/cxUUCema47jr/YToixTT+Q6O,5IiCoM9B1/788ntB,P07JH0h6qoM6TSUAK2aL9T5s2QBVeY9JWvalf,+oK0AN",
          required: !1,
        },
        { name: "captcha_sign", type: "string", default: "", required: !1 },
        { name: "timestamp", type: "string", default: "", required: !1 },
        { name: "captcha_token", type: "string", default: "", required: !1 },
        {
          name: "credit_key",
          type: "string",
          default: "",
          required: !1,
          help: "credit key, used for login",
        },
        { name: "device_id", type: "string", default: "", required: !1 },
        {
          name: "client_id",
          type: "string",
          default: "Xp6vsxz_7IYVw2BB",
          required: !0,
        },
        {
          name: "client_secret",
          type: "string",
          default: "Xp6vsy4tN9toTVdMSpomVdXpRmES",
          required: !0,
        },
        {
          name: "client_version",
          type: "string",
          default: "8.31.0.9726",
          required: !0,
        },
        {
          name: "package_name",
          type: "string",
          default: "com.xunlei.downloadprovider",
          required: !0,
        },
        {
          name: "user_agent",
          type: "string",
          default:
            "ANDROID-com.xunlei.downloadprovider/8.31.0.9726 netWorkType/5G appid/40 deviceName/Xiaomi_M2004j7ac deviceModel/M2004J7AC OSVersion/12 protocolVersion/301 platformVersion/10 sdkVersion/512000 Oauth2Client/0.9 (Linux 4_14_186-perf-gddfs8vbb238b) (JAVA 0)",
          required: !0,
        },
        {
          name: "download_user_agent",
          type: "string",
          default:
            "Dalvik/2.1.0 (Linux; U; Android 12; M2004J7AC Build/SP1A.210812.016)",
          required: !0,
        },
        { name: "use_video_url", type: "bool", default: "false", required: !1 },
        {
          name: "space",
          type: "string",
          default: "",
          required: !1,
          help: "device id for remote device",
        },
        {
          name: "order_by",
          type: "select",
          options: "name,size,modified",
          default: "name",
          required: !1,
        },
        {
          name: "order_direction",
          type: "select",
          options: "asc,desc",
          default: "asc",
          required: !1,
        },
      ],
      config: {
        name: "ThunderExpert",
        local_sort: !0,
        only_local: !1,
        only_proxy: !1,
        no_cache: !1,
        no_upload: !1,
        need_ms: !1,
        default_root: "",
      },
    },
    "189Cloud": {
      name: "189Cloud",
      default_mount_path: "/189",
      common: de,
      additional: [
        {
          name: "username",
          type: "string",
          default: "",
          required: !0,
          help: "the phone number used to log in",
        },
        {
          name: "password",
          type: "string",
          default: "",
          required: !0,
          help: "password for login",
        },
        {
          name: "cookie",
          type: "text",
          default: "",
          required: !1,
          help: "Fill in the cookie if need captcha (\u82E5\u9047\u6ED1\u5757\u9A8C\u8BC1\u7801\u6216\u8BBE\u5907\u9501\uFF0C\u53EF\u5728\u6D4F\u89C8\u5668\u767B\u5F55\u540E\u590D\u5236 Cookie \u586B\u5165)",
        },
        {
          name: "root_folder_id",
          type: "string",
          default: "-11",
          required: !1,
          help: "\u6839\u6587\u4EF6\u5939ID\uFF0C\u9ED8\u8BA4\u4E3A -11\uFF08\u4E2A\u4EBA\u4E91\u6839\u76EE\u5F55\uFF09",
        },
        {
          name: "order_by",
          type: "select",
          options: "lastOpTime,filename,fileSize",
          default: "lastOpTime",
          required: !1,
        },
        {
          name: "order_direction",
          type: "select",
          options: "desc,asc",
          default: "desc",
          required: !1,
        },
      ],
      config: {
        name: "189Cloud",
        local_sort: !0,
        only_local: !1,
        only_proxy: !1,
        no_cache: !1,
        no_upload: !1,
        need_ms: !1,
        default_root: "-11",
      },
    },
    Lanzou: {
      name: "Lanzou",
      default_mount_path: "/lanzou",
      common: de,
      additional: [
        {
          name: "type",
          type: "select",
          options: "cookie,account,url",
          default: "cookie",
          required: !0,
        },
        {
          name: "account",
          type: "string",
          default: "",
          required: !1,
          help: "\u8D26\u53F7\uFF08\u624B\u673A\u53F7/UID\uFF09\uFF0C\u4EC5 account \u6A21\u5F0F\u9700\u586B\u5199",
        },
        {
          name: "password",
          type: "string",
          default: "",
          required: !1,
          help: "\u5BC6\u7801\uFF0C\u4EC5 account \u6A21\u5F0F\u9700\u586B\u5199",
        },
        {
          name: "cookie",
          type: "text",
          default: "",
          required: !1,
          help: "\u767B\u5F55 Cookie\uFF08\u542B ylogin, phpdisk_info \u7B49\uFF09\uFF0Ccookie \u6A21\u5F0F\u9700\u586B\u5199\uFF1B\u6709\u6548\u671F\u7EA6 15 \u5929",
        },
        {
          name: "root_folder_id",
          type: "string",
          default: "-1",
          required: !1,
          help: "\u6839\u6587\u4EF6\u5939 ID / \u5206\u4EAB ID\uFF08\u4E2A\u4EBA\u76D8\u9ED8\u8BA4 -1\uFF0C\u5206\u4EAB\u94FE\u63A5\u586B\u5206\u4EAB ID \u5982 b00xxxx\uFF09",
        },
        {
          name: "share_password",
          type: "string",
          default: "",
          required: !1,
          help: "\u63D0\u53D6\u7801 / \u8BBF\u95EE\u5BC6\u7801\uFF08\u65E0\u5BC6\u7801\u7559\u7A7A\uFF09",
        },
        {
          name: "baseUrl",
          type: "string",
          default: "https://pc.woozooo.com",
          required: !1,
          help: "\u57FA\u672C API \u57DF\u540D",
        },
        {
          name: "shareUrl",
          type: "string",
          default: "https://pan.lanzoui.com",
          required: !1,
          help: "\u5206\u4EAB\u9875\u9762\u89E3\u6790\u57DF\u540D",
        },
        {
          name: "user_agent",
          type: "string",
          default:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/142.0.0.0 OpenList/42",
          required: !0,
          help: "\u53D1\u9001\u7ED9\u84DD\u594F\u4E91 API \u4E0E\u76F4\u94FE\u89E3\u6790\u65F6\u643A\u5E26\u7684\u5BA2\u6237\u7AEF User-Agent",
        },
        {
          name: "repair_file_info",
          type: "bool",
          default: "false",
          required: !1,
          help: "\u901A\u8FC7 HEAD \u8BF7\u6C42\u4FEE\u6B63\u6587\u4EF6\u7CBE\u786E\u5927\u5C0F\u4E0E\u4FEE\u6539\u65F6\u95F4\uFF08WebDAV \u63A8\u8350\u5F00\u542F\uFF09",
        },
        {
          name: "order_by",
          type: "select",
          options: "name,size,time",
          default: "name",
          required: !1,
        },
        {
          name: "order_direction",
          type: "select",
          options: "asc,desc",
          default: "asc",
          required: !1,
        },
      ],
      config: {
        name: "Lanzou",
        local_sort: !0,
        only_local: !1,
        only_proxy: !1,
        no_cache: !1,
        no_upload: !1,
        need_ms: !1,
        default_root: "-1",
      },
    },
    WebDav: {
      name: "WebDav",
      default_mount_path: "/webdav",
      common: de,
      additional: [
        {
          name: "vendor",
          type: "select",
          options: "other,sharepoint",
          default: "other",
          required: !0,
        },
        { name: "address", type: "string", default: "", required: !0 },
        { name: "username", type: "string", default: "", required: !0 },
        { name: "password", type: "string", default: "", required: !0 },
        {
          name: "root_folder_path",
          type: "string",
          default: "/",
          required: !1,
        },
        {
          name: "tls_insecure_skip_verify",
          type: "bool",
          default: "false",
          required: !1,
        },
        {
          name: "order_by",
          type: "select",
          options: "name,size,modified",
          default: "name",
          required: !1,
        },
        {
          name: "order_direction",
          type: "select",
          options: "asc,desc",
          default: "asc",
          required: !1,
        },
      ],
      config: {
        name: "WebDav",
        local_sort: !0,
        only_local: !1,
        only_proxy: !0,
        no_cache: !1,
        no_upload: !1,
        need_ms: !1,
        default_root: "/",
      },
    },
    WoPan: {
      name: "WoPan",
      default_mount_path: "/wopan",
      common: de,
      additional: [
        { name: "root_folder_id", type: "string", default: "0", required: !1 },
        { name: "refresh_token", type: "text", default: "", required: !0 },
        {
          name: "family_id",
          type: "string",
          default: "",
          required: !1,
          help: "true",
        },
        {
          name: "sort_rule",
          type: "select",
          options: "name_asc,name_desc,time_asc,time_desc,size_asc,size_desc",
          default: "name_asc",
          required: !1,
        },
        { name: "access_token", type: "string", default: "", required: !1 },
        {
          name: "order_by",
          type: "select",
          options: "name,size,modified",
          default: "name",
          required: !1,
        },
        {
          name: "order_direction",
          type: "select",
          options: "asc,desc",
          default: "asc",
          required: !1,
        },
      ],
      config: {
        name: "WoPan",
        local_sort: !0,
        only_local: !1,
        only_proxy: !1,
        no_cache: !1,
        no_upload: !1,
        need_ms: !1,
        default_root: "0",
        no_overwrite_upload: !0,
      },
    },
    S3: {
      name: "S3",
      default_mount_path: "/s3",
      common: de,
      additional: [
        {
          name: "root_folder_path",
          type: "string",
          default: "/",
          required: !1,
        },
        { name: "bucket", type: "string", default: "", required: !0 },
        { name: "endpoint", type: "string", default: "", required: !0 },
        { name: "region", type: "string", default: "", required: !1 },
        { name: "access_key_id", type: "string", default: "", required: !0 },
        {
          name: "secret_access_key",
          type: "string",
          default: "",
          required: !0,
        },
        { name: "session_token", type: "string", default: "", required: !1 },
        { name: "custom_host", type: "string", default: "", required: !1 },
        {
          name: "enable_custom_host_presign",
          type: "bool",
          default: "false",
          required: !1,
        },
        { name: "sign_url_expire", type: "number", default: "4", required: !1 },
        { name: "placeholder", type: "string", default: "", required: !1 },
        {
          name: "force_path_style",
          type: "bool",
          default: "false",
          required: !1,
        },
        {
          name: "list_object_version",
          type: "select",
          options: "v1,v2",
          default: "v1",
          required: !1,
        },
        {
          name: "remove_bucket",
          type: "bool",
          default: "false",
          required: !1,
          help: "true",
        },
        {
          name: "add_filename_to_disposition",
          type: "bool",
          default: "false",
          required: !1,
          help: "true",
        },
        {
          name: "enable_direct_upload",
          type: "bool",
          default: "false",
          required: !1,
        },
        {
          name: "direct_upload_host",
          type: "string",
          default: "",
          required: !1,
        },
        {
          name: "user_agent",
          type: "string",
          default: "",
          required: !1,
          help: "true",
        },
        {
          name: "order_by",
          type: "select",
          options: "name,size,modified",
          default: "name",
          required: !1,
        },
        {
          name: "order_direction",
          type: "select",
          options: "asc,desc",
          default: "asc",
          required: !1,
        },
      ],
      config: {
        name: "S3",
        local_sort: !0,
        only_local: !1,
        only_proxy: !1,
        no_cache: !1,
        no_upload: !1,
        need_ms: !1,
        default_root: "/",
        check_status: !0,
      },
    },
    Doge: {
      name: "Doge",
      default_mount_path: "/doge",
      common: de,
      additional: [
        {
          name: "root_folder_path",
          type: "string",
          default: "/",
          required: !1,
        },
        { name: "bucket", type: "string", default: "", required: !0 },
        { name: "endpoint", type: "string", default: "", required: !0 },
        { name: "region", type: "string", default: "", required: !1 },
        { name: "access_key_id", type: "string", default: "", required: !0 },
        {
          name: "secret_access_key",
          type: "string",
          default: "",
          required: !0,
        },
        { name: "session_token", type: "string", default: "", required: !1 },
        { name: "custom_host", type: "string", default: "", required: !1 },
        {
          name: "enable_custom_host_presign",
          type: "bool",
          default: "false",
          required: !1,
        },
        { name: "sign_url_expire", type: "number", default: "4", required: !1 },
        { name: "placeholder", type: "string", default: "", required: !1 },
        {
          name: "force_path_style",
          type: "bool",
          default: "false",
          required: !1,
        },
        {
          name: "list_object_version",
          type: "select",
          options: "v1,v2",
          default: "v1",
          required: !1,
        },
        {
          name: "remove_bucket",
          type: "bool",
          default: "false",
          required: !1,
          help: "true",
        },
        {
          name: "add_filename_to_disposition",
          type: "bool",
          default: "false",
          required: !1,
          help: "true",
        },
        {
          name: "enable_direct_upload",
          type: "bool",
          default: "false",
          required: !1,
        },
        {
          name: "direct_upload_host",
          type: "string",
          default: "",
          required: !1,
        },
        {
          name: "user_agent",
          type: "string",
          default: "",
          required: !1,
          help: "true",
        },
        {
          name: "order_by",
          type: "select",
          options: "name,size,modified",
          default: "name",
          required: !1,
        },
        {
          name: "order_direction",
          type: "select",
          options: "asc,desc",
          default: "asc",
          required: !1,
        },
      ],
      config: {
        name: "Doge",
        local_sort: !0,
        only_local: !1,
        only_proxy: !1,
        no_cache: !1,
        no_upload: !1,
        need_ms: !1,
        default_root: "/",
        check_status: !0,
      },
    },
    WeiYun: {
      name: "WeiYun",
      default_mount_path: "/weiyun",
      common: de,
      additional: [
        { name: "root_folder_id", type: "string", default: "", required: !1 },
        { name: "cookies", type: "text", default: "", required: !0 },
        {
          name: "order_by",
          type: "select",
          options: "name,size,updated_at",
          default: "name",
          required: !1,
        },
        {
          name: "order_direction",
          type: "select",
          options: "asc,desc",
          default: "asc",
          required: !1,
        },
        {
          name: "upload_thread",
          type: "string",
          default: "4",
          required: !1,
          help: "4<=thread<=32",
        },
      ],
      config: {
        name: "WeiYun",
        local_sort: !1,
        only_local: !1,
        only_proxy: !0,
        no_cache: !1,
        no_upload: !1,
        need_ms: !1,
        default_root: "",
        check_status: !0,
      },
    },
    SFTP: {
      name: "SFTP",
      default_mount_path: "/sftp",
      common: de,
      additional: [
        {
          name: "address",
          type: "string",
          default: "",
          required: !0,
          help: "SSH host:port (e.g. 127.0.0.1:22)",
        },
        { name: "username", type: "string", default: "", required: !0 },
        { name: "password", type: "string", default: "", required: !1 },
        { name: "private_key", type: "text", default: "", required: !1 },
        { name: "passphrase", type: "string", default: "", required: !1 },
        {
          name: "root_folder_path",
          type: "string",
          default: "/",
          required: !1,
        },
        {
          name: "ignore_symlink_error",
          type: "bool",
          default: "false",
          required: !1,
          help: "Ignore symlink error",
        },
      ],
      config: {
        name: "SFTP",
        local_sort: !0,
        only_local: !1,
        only_proxy: !0,
        no_cache: !1,
        no_upload: !1,
        need_ms: !1,
        default_root: "/",
        check_status: !0,
        no_link_url: !0,
      },
    },
    FTP: {
      name: "FTP",
      default_mount_path: "/ftp",
      common: de,
      additional: [
        {
          name: "address",
          type: "string",
          default: "",
          required: !0,
          help: "FTP host:port (e.g. 127.0.0.1:21)",
        },
        { name: "username", type: "string", default: "", required: !0 },
        { name: "password", type: "string", default: "", required: !0 },
        {
          name: "encoding",
          type: "string",
          default: "utf-8",
          required: !0,
          help: "Character encoding, e.g. utf-8, gbk, gb2312",
        },
        {
          name: "cwd_list",
          type: "bool",
          default: "false",
          required: !1,
          help: "Enter directory before listing",
        },
        {
          name: "root_folder_path",
          type: "string",
          default: "/",
          required: !1,
        },
      ],
      config: {
        name: "FTP",
        local_sort: !0,
        only_local: !1,
        only_proxy: !0,
        no_cache: !1,
        no_upload: !1,
        need_ms: !1,
        default_root: "/",
        check_status: !0,
        no_link_url: !0,
      },
    },
  }
z.get("/driver/list", (r) =>
  r.json({ code: 200, message: "success", data: Zs }),
)
z.get("/driver/info", (r) => {
  let e = r.req.query("driver") || "",
    t = Zs[e] || Zs.AliyundriveOpen
  return r.json({ code: 200, message: "success", data: t })
})
z.get("/setting/list", async (r) => {
  let e = await U(r.env),
    t = r.req.query("group"),
    i = r.req.query("groups"),
    s = e.settings || []
  if (t !== void 0) {
    let n = parseInt(t, 10)
    s = s.filter((o) => o.group === n)
  } else if (i !== void 0) {
    let n = i.split(",").map((o) => parseInt(o, 10))
    s = s.filter((o) => n.includes(o.group))
  }
  return r.json({ code: 200, message: "success", data: s })
})
z.post("/setting/save", async (r) => {
  let e = await r.req.json().catch(() => []),
    t = await U(r.env)
  t.settings || (t.settings = [])
  for (let s of e) {
    let n = t.settings.findIndex((o) => o.key === s.key)
    n !== -1
      ? ((t.settings[n].value = s.value),
        s.group !== void 0 && (t.settings[n].group = s.group))
      : t.settings.push(s)
  }
  let i = new Set()
  return (
    (t.settings = t.settings.filter((s) =>
      !s.key || i.has(s.key) ? !1 : (i.add(s.key), !0),
    )),
    await $(t, r.env),
    r.json({ code: 200, message: "success", data: null })
  )
})
z.post("/setting/default", async (r) => {
  let e = r.req.query("group")
  if (e === void 0)
    return r.json({ code: 400, message: "group is required", data: null })
  let t = parseInt(e, 10),
    i = await U(r.env)
  i.settings = (i.settings || []).filter((o) => o.group !== t)
  let s = vr.settings.filter((o) => o.group === t),
    n = new Set(s.map((o) => o.key))
  return (
    (i.settings = i.settings.filter((o) => !n.has(o.key))),
    i.settings.push(...JSON.parse(JSON.stringify(s))),
    await $(i, r.env),
    r.json({ code: 200, message: "success", data: s })
  )
})
z.post("/setting/delete", async (r) => {
  let e = r.req.query("key")
  if (!e) return r.json({ code: 400, message: "key is required", data: null })
  let t = await U(r.env)
  return (
    (t.settings = (t.settings || []).filter((i) => i.key !== e)),
    await $(t, r.env),
    r.json({ code: 200, message: "success", data: null })
  )
})
function gg(r = 32) {
  let e = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    t = ""
  for (let i = 0; i < r; i++)
    t += e.charAt(Math.floor(Math.random() * e.length))
  return t
}
z.post("/setting/reset_token", async (r) => {
  let e = await U(r.env),
    t = gg(32),
    i = (e.settings || []).findIndex((s) => s.key === "token")
  return (
    i !== -1
      ? ((e.settings[i].value = t),
        e.settings[i].group !== 5 &&
          e.settings[i].group !== 0 &&
          (e.settings[i].group = 5))
      : (e.settings || (e.settings = []),
        e.settings.push({
          key: "token",
          value: t,
          type: "string",
          help: "115 / PikPak / Thunder Token",
          group: 5,
          flag: 0,
        })),
    await $(e, r.env),
    r.json({ code: 200, message: "success", data: t })
  )
})
var st = async (r, e, t = 14) => {
  let i = await U(r)
  i.settings || (i.settings = [])
  for (let [s, n] of Object.entries(e)) {
    if (n === void 0) continue
    let o = i.settings.findIndex((a) => a.key === s)
    o !== -1
      ? (i.settings[o].value = n)
      : i.settings.push({
          key: s,
          value: n,
          type: "string",
          help: s,
          group: t,
          flag: 0,
        })
  }
  await $(i, r)
}
z.post("/setting/set_115", async (r) => {
  let e = await r.req.json().catch(() => ({}))
  return (
    await st(r.env, { "115_temp_dir": e.temp_dir || "" }),
    r.json({ code: 200, message: "success", data: "success" })
  )
})
z.post("/setting/set_115_open", async (r) => {
  let e = await r.req.json().catch(() => ({}))
  return (
    await st(r.env, { "115_open_temp_dir": e.temp_dir || "" }),
    r.json({ code: 200, message: "success", data: "success" })
  )
})
z.post("/setting/set_123_pan", async (r) => {
  let e = await r.req.json().catch(() => ({}))
  return (
    await st(r.env, {
      "123_pan_temp_dir": e.temp_dir || "",
      "123_temp_dir": e.temp_dir || "",
    }),
    r.json({ code: 200, message: "success", data: "success" })
  )
})
z.post("/setting/set_123_open", async (r) => {
  let e = await r.req.json().catch(() => ({}))
  return (
    await st(r.env, {
      "123_open_temp_dir": e.temp_dir || "",
      "123_open_callback_url": e.callback_url || "",
    }),
    r.json({ code: 200, message: "success", data: "success" })
  )
})
z.post("/setting/set_pikpak", async (r) => {
  let e = await r.req.json().catch(() => ({}))
  return (
    await st(r.env, { pikpak_temp_dir: e.temp_dir || "" }),
    r.json({ code: 200, message: "success", data: "success" })
  )
})
z.post("/setting/set_thunder", async (r) => {
  let e = await r.req.json().catch(() => ({}))
  return (
    await st(r.env, { thunder_temp_dir: e.temp_dir || "" }),
    r.json({ code: 200, message: "success", data: "success" })
  )
})
z.post("/setting/set_thunder_browser", async (r) => {
  let e = await r.req.json().catch(() => ({}))
  return (
    await st(r.env, { thunder_browser_temp_dir: e.temp_dir || "" }),
    r.json({ code: 200, message: "success", data: "success" })
  )
})
z.post("/setting/set_thunderx", async (r) => {
  let e = await r.req.json().catch(() => ({}))
  return (
    await st(r.env, { thunderx_temp_dir: e.temp_dir || "" }),
    r.json({ code: 200, message: "success", data: "success" })
  )
})
z.post("/setting/reset_token", async (r) => {
  let e =
    typeof crypto < "u" && typeof crypto.randomUUID == "function"
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).substring(2) +
        Math.random().toString(36).substring(2)
  return (
    await st(r.env, { token: e }),
    r.json({ code: 200, message: "success", data: e })
  )
})
z.get("/meta/list", async (r) => {
  let e = await U(r.env)
  return r.json({
    code: 200,
    message: "success",
    data: { content: e.metas, total: e.metas.length },
  })
})
z.get("/meta/get", async (r) => {
  let e = parseInt(r.req.query("id") || "0", 10),
    i = ((await U(r.env)).metas || []).find((s) => s.id === e)
  return i
    ? r.json({ code: 200, message: "success", data: i })
    : r.json({ code: 404, message: "meta not found", data: null })
})
z.post("/meta/create", async (r) => {
  let e = await r.req.json().catch(() => ({})),
    t = await U(r.env)
  t.metas || (t.metas = [])
  let i =
    "/" +
    String(e.path || "")
      .split("/")
      .filter(Boolean)
      .join("/")
  if (!i || i === "/")
    return r.json({ code: 400, message: "path is required", data: null })
  if (t.metas.some((n) => n.path === i))
    return r.json({ code: 400, message: "meta already exists", data: null })
  let s = {
    id: t.metas.length ? Math.max(...t.metas.map((n) => n.id)) + 1 : 1,
    path: i,
    password: e.password || "",
    read_users: e.read_users || [],
    read_users_sub: !!e.read_users_sub,
    write_users: e.write_users || [],
    write_users_sub: !!e.write_users_sub,
    p_sub: !!e.p_sub,
    write: !!e.write,
    w_sub: !!e.w_sub,
    hide: e.hide || "",
    h_sub: !!e.h_sub,
    readme: e.readme || "",
    r_sub: !!e.r_sub,
    header: e.header || "",
    header_sub: !!e.header_sub,
  }
  return (
    t.metas.push(s),
    await $(t, r.env),
    r.json({ code: 200, message: "success", data: s })
  )
})
z.post("/meta/update", async (r) => {
  let e = await r.req.json().catch(() => ({})),
    t = await U(r.env)
  t.metas || (t.metas = [])
  let i = t.metas.findIndex((n) => n.id === e.id)
  if (i === -1)
    return r.json({ code: 404, message: "meta not found", data: null })
  let s =
    e.path !== void 0
      ? "/" + String(e.path).split("/").filter(Boolean).join("/")
      : t.metas[i].path
  return s && t.metas.some((n) => n.path === s && n.id !== e.id)
    ? r.json({ code: 400, message: "meta already exists", data: null })
    : ((t.metas[i] = {
        ...t.metas[i],
        ...(s ? { path: s } : {}),
        password: e.password !== void 0 ? e.password : t.metas[i].password,
        read_users:
          e.read_users !== void 0 ? e.read_users : t.metas[i].read_users,
        read_users_sub:
          e.read_users_sub !== void 0
            ? !!e.read_users_sub
            : t.metas[i].read_users_sub,
        write_users:
          e.write_users !== void 0 ? e.write_users : t.metas[i].write_users,
        write_users_sub:
          e.write_users_sub !== void 0
            ? !!e.write_users_sub
            : t.metas[i].write_users_sub,
        p_sub: e.p_sub !== void 0 ? !!e.p_sub : t.metas[i].p_sub,
        write: e.write !== void 0 ? !!e.write : t.metas[i].write,
        w_sub: e.w_sub !== void 0 ? !!e.w_sub : t.metas[i].w_sub,
        hide: e.hide !== void 0 ? e.hide : t.metas[i].hide,
        h_sub: e.h_sub !== void 0 ? !!e.h_sub : t.metas[i].h_sub,
        readme: e.readme !== void 0 ? e.readme : t.metas[i].readme,
        r_sub: e.r_sub !== void 0 ? !!e.r_sub : t.metas[i].r_sub,
        header: e.header !== void 0 ? e.header : t.metas[i].header,
        header_sub:
          e.header_sub !== void 0 ? !!e.header_sub : t.metas[i].header_sub,
      }),
      await $(t, r.env),
      r.json({ code: 200, message: "success", data: null }))
})
z.post("/meta/delete", async (r) => {
  let e = parseInt(r.req.query("id") || "0", 10),
    t = await U(r.env)
  return (
    t.metas || (t.metas = []),
    (t.metas = t.metas.filter((i) => i.id !== e)),
    await $(t, r.env),
    r.json({ code: 200, message: "success", data: null })
  )
})
z.route("/user", Me)
z.get("/kv/status", async (r) => {
  let e = await En(r.env)
  return r.json({ code: 200, message: "success", data: e })
})
z.get("/index/progress", (r) =>
  r.json({
    code: 200,
    message: "success",
    data: { total: 0, current: 0, speed: 0 },
  }),
)
z.get("/scan/progress", (r) =>
  r.json({
    code: 200,
    message: "success",
    data: { total: 0, current: 0, speed: 0 },
  }),
)
z.get("/plugin/list", async (r) => {
  let e = await U(r.env)
  return (
    e.plugins || (e.plugins = []),
    r.json({
      code: 200,
      message: "success",
      data: { content: e.plugins, total: e.plugins.length },
    })
  )
})
z.get("/plugin/get", async (r) => {
  let e = r.req.query("id")
  if (!e) return r.json({ code: 400, message: "id is required", data: null })
  let t = await U(r.env)
  t.plugins || (t.plugins = [])
  let i = t.plugins.find((s) => s.id === e)
  return i
    ? r.json({ code: 200, message: "success", data: i })
    : r.json({ code: 404, message: "Plugin not found", data: null })
})
z.post("/plugin/install", async (r) => {
  try {
    let e = await r.req.json(),
      t = e
    if (e.manifest_url && typeof e.manifest_url == "string")
      try {
        let a = await fetch(e.manifest_url)
        if (!a.ok)
          return r.json({
            code: 400,
            message: `Failed to fetch plugin manifest from URL: HTTP ${a.status}`,
            data: null,
          })
        t = { ...(await a.json()), ...e }
      } catch (a) {
        return r.json({
          code: 400,
          message: `Network error fetching plugin manifest: ${ie(a, "unexpected network error")}`,
          data: null,
        })
      }
    if (!t.id || !t.name)
      return r.json({
        code: 400,
        message: "Plugin id and name are required",
        data: null,
      })
    let i = await U(r.env)
    i.plugins || (i.plugins = [])
    let s = i.plugins.findIndex((a) => a.id === t.id),
      n = new Date().toISOString(),
      o = {
        id: t.id,
        name: t.name,
        version: t.version || "1.0.0",
        description: t.description || "",
        author: t.author || "Unknown",
        homepage: t.homepage || "",
        repository: t.repository || "",
        icon: t.icon || "",
        type: t.type || "ui",
        enabled: t.enabled !== void 0 ? !!t.enabled : !0,
        high_privilege: !!t.high_privilege,
        permissions: Array.isArray(t.permissions) ? t.permissions : [],
        entry_url: t.entry_url || "",
        script_content: t.script_content || "",
        style_content: t.style_content || "",
        config_schema: t.config_schema || [],
        config_values: t.config_values || t.default_config || {},
        target_hooks: t.target_hooks || ["global"],
        is_builtin: !!t.is_builtin,
        tags: t.tags || [],
        created_at: s >= 0 ? i.plugins[s].created_at : n,
        updated_at: n,
      }
    return (
      s >= 0 ? (i.plugins[s] = o) : i.plugins.push(o),
      await $(i, r.env),
      r.json({ code: 200, message: "Plugin installed successfully", data: o })
    )
  } catch (e) {
    return r.json({
      code: 500,
      message: e.message || "Failed to install plugin",
      data: null,
    })
  }
})
z.post("/plugin/update", async (r) => {
  try {
    let e = await r.req.json()
    if (!e.id)
      return r.json({ code: 400, message: "Plugin id is required", data: null })
    let t = await U(r.env)
    t.plugins || (t.plugins = [])
    let i = t.plugins.findIndex((o) => o.id === e.id)
    if (i === -1)
      return r.json({ code: 404, message: "Plugin not found", data: null })
    let s = t.plugins[i],
      n = { ...s, ...e, id: s.id, updated_at: new Date().toISOString() }
    return (
      (t.plugins[i] = n),
      await $(t, r.env),
      r.json({ code: 200, message: "Plugin updated successfully", data: n })
    )
  } catch (e) {
    return r.json({
      code: 500,
      message: e.message || "Failed to update plugin",
      data: null,
    })
  }
})
z.post("/plugin/toggle", async (r) => {
  try {
    let e = await r.req.json()
    if (!e.id)
      return r.json({ code: 400, message: "Plugin id is required", data: null })
    let t = await U(r.env)
    t.plugins || (t.plugins = [])
    let i = t.plugins.findIndex((n) => n.id === e.id)
    if (i === -1)
      return r.json({ code: 404, message: "Plugin not found", data: null })
    let s = e.enabled !== void 0 ? !!e.enabled : !t.plugins[i].enabled
    return (
      (t.plugins[i].enabled = s),
      (t.plugins[i].updated_at = new Date().toISOString()),
      await $(t, r.env),
      r.json({
        code: 200,
        message: s ? "Plugin enabled" : "Plugin disabled",
        data: { id: e.id, enabled: s },
      })
    )
  } catch (e) {
    return r.json({
      code: 500,
      message: e.message || "Failed to toggle plugin",
      data: null,
    })
  }
})
z.post("/plugin/delete", async (r) => {
  try {
    let t = r.req.query("id")
    if (!t)
      try {
        t = (await r.req.json()).id
      } catch {}
    if (!t)
      return r.json({ code: 400, message: "Plugin id is required", data: null })
    let i = await U(r.env)
    i.plugins || (i.plugins = [])
    let s = i.plugins.length
    return (
      (i.plugins = i.plugins.filter((n) => n.id !== t)),
      i.plugins.length === s
        ? r.json({ code: 404, message: "Plugin not found", data: null })
        : (await $(i, r.env),
          r.json({
            code: 200,
            message: "Plugin deleted successfully",
            data: null,
          }))
    )
  } catch (e) {
    return r.json({
      code: 500,
      message: e.message || "Failed to delete plugin",
      data: null,
    })
  }
})
z.post("/plugin/batch_save", async (r) => {
  try {
    let e = await r.req.json(),
      t = Array.isArray(e) ? e : e.plugins
    if (!Array.isArray(t))
      return r.json({
        code: 400,
        message: "plugins array is required",
        data: null,
      })
    let i = await U(r.env)
    return (
      (i.plugins = t),
      await $(i, r.env),
      r.json({
        code: 200,
        message: "Plugins saved successfully",
        data: { count: t.length },
      })
    )
  } catch (e) {
    return r.json({
      code: 500,
      message: e.message || "Failed to batch save plugins",
      data: null,
    })
  }
})
te()
te()
function Vo(r, e) {
  let t = r.replace(/bytes=/, "").split("-"),
    i = parseInt(t[0], 10),
    s = t[1] ? parseInt(t[1], 10) : e - 1,
    n = s - i + 1
  return { start: i, end: s, chunksize: n }
}
Ge()
Mr()
var tn = null,
  en = null
async function mg() {
  if (typeof process < "u" && process.release?.name === "node" && !tn)
    try {
      ;((tn = await import("fs/promises")),
        (en = (await import("fs")).createReadStream))
    } catch {}
}
var Xe = new J(),
  yg = (r) => {
    try {
      let e = r.executionCtx
      return !e || typeof e.waitUntil != "function"
        ? void 0
        : { waitUntil: (t) => e.waitUntil(t) }
    } catch {
      return
    }
  }
Xe.get("/*", async (r) => {
  await mg()
  let e =
      r.req.query("proxy") === "true" ||
      r.req.path.startsWith("/p") ||
      r.req.path.startsWith("/api/p") ||
      r.req.path.startsWith("/sd") ||
      r.req.path.startsWith("/api/sd"),
    t = r.req.path
      .replace(/^\/api\/raw/, "")
      .replace(/^\/api\/d/, "")
      .replace(/^\/api\/sd/, "")
      .replace(/^\/api\/p/, "")
      .replace(/^\/raw/, "")
      .replace(/^\/d/, "")
      .replace(/^\/sd/, "")
      .replace(/^\/p/, ""),
    i = decodeURIComponent(t)
  try {
    let s = i,
      n = r.req.path.startsWith("/api/sd") || r.req.path.startsWith("/sd")
    if (n) {
      let d = await Jt(s, r.req.query("pwd") || "", r.env)
      if (!d.ok) return r.text(d.error || "Share not found", 404)
      if (d.virtualList || !d.realPath)
        return r.text("Cannot download share root", 400)
      s = d.realPath
    } else {
      let d = await Y(r)
      if (!d || d.disabled) return r.text("Unauthorized", 401)
    }
    if (!n && (await Hr(r)).enabled) {
      let l = r.req.query("sign") || ""
      if (!(await e0(r, s, l))) return r.text("Invalid or expired sign", 401)
    }
    let o = await ne(s)
    if (o.isVirtual || !o.physical)
      return r.text("Cannot download virtual directory path", 400)
    if (o.storage) {
      let d = (o.storage.driver || "").toLowerCase().replace(/[^a-z0-9]/g, "")
      if (d !== "local")
        try {
          let l = await ee(o.storage.driver, o.storage),
            u
          try {
            u = await l.get(s, o.physical)
          } finally {
            await be(o.storage.driver, o.storage, l, yg(r))
          }
          if (u && u.raw_url)
            if (
              e ||
              d === "webdav" ||
              d === "sharepoint" ||
              d === "onedrive" ||
              d === "onedriveapp" ||
              d === "weiyun" ||
              d === "tencentweiyun"
            ) {
              console.log(
                `[rawRouter] Proxying download for '${s}' via ${o.storage.driver}`,
              )
              let p = { ...(u.raw_url_headers || {}) }
              p["User-Agent"] ||
                (p["User-Agent"] =
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
              let h = r.req.header("Range")
              h && (p.Range = h)
              let m = await fetch(u.raw_url, { headers: p })
              ;(m.status === 412 &&
                (console.warn(
                  `[rawRouter] Upstream returned 412 for '${s}', retrying without Range header...`,
                ),
                delete p.Range,
                (m = await fetch(u.raw_url, { headers: p }))),
                r.header("Access-Control-Allow-Origin", "*"),
                r.header("Access-Control-Allow-Methods", "GET, OPTIONS, HEAD"),
                r.header(
                  "Access-Control-Expose-Headers",
                  "Content-Range, Accept-Ranges, Content-Length, Content-Disposition",
                ))
              let w = {
                  pdf: "application/pdf",
                  mp4: "video/mp4",
                  webm: "video/webm",
                  mkv: "video/x-matroska",
                  mp3: "audio/mpeg",
                  flac: "audio/flac",
                  m3u8: "application/vnd.apple.mpegurl",
                  ts: "video/mp2t",
                  png: "image/png",
                  jpg: "image/jpeg",
                  jpeg: "image/jpeg",
                  gif: "image/gif",
                  webp: "image/webp",
                  svg: "image/svg+xml",
                },
                g = s.split(".").pop()?.toLowerCase() || "",
                y = w[g] || "application/octet-stream"
              r.header("Content-Type", m.headers.get("content-type") || y)
              let v = m.headers.get("content-length")
              v && r.header("Content-Length", v)
              let x = m.headers.get("content-range")
              ;(x && r.header("Content-Range", x),
                r.header(
                  "Accept-Ranges",
                  m.headers.get("accept-ranges") || "bytes",
                ))
              let _ = m.headers.get("etag")
              _ && r.header("ETag", _)
              let b = m.headers.get("last-modified")
              b && r.header("Last-Modified", b)
              let S = m.headers.get("cache-control")
              S && r.header("Cache-Control", S)
              let A = m.headers.get("content-disposition")
              return (
                A && r.header("Content-Disposition", A),
                r.body(m.body, m.status)
              )
            } else
              return (
                console.log(
                  `[rawRouter] Redirecting download for '${s}' via ${o.storage.driver}`,
                ),
                r.redirect(u.raw_url, 302)
              )
          else if (typeof l.createReadStream == "function" && u && !u.is_dir) {
            r.header("Access-Control-Allow-Origin", "*")
            let f = u.size || 0,
              p = r.req.header("Range")
            if (p && f > 0) {
              let { start: h, end: m, chunksize: w } = Vo(p, f),
                g = await l.createReadStream(o.physical, { start: h, end: m })
              return (
                r.header("Content-Range", `bytes ${h}-${m}/${f}`),
                r.header("Accept-Ranges", "bytes"),
                r.header("Content-Length", w.toString()),
                r.header("Content-Type", "application/octet-stream"),
                r.body(g, 206)
              )
            } else {
              ;(f > 0 && r.header("Content-Length", f.toString()),
                r.header("Accept-Ranges", "bytes"),
                r.header("Content-Type", "application/octet-stream"))
              let h = await l.createReadStream(o.physical)
              return r.body(h)
            }
          } else {
            let f =
              u?.raw_url_error ||
              (u?.is_dir
                ? "\u8BE5\u6761\u76EE\u662F\u6587\u4EF6\u5939\uFF0C\u4E0D\u53EF\u4F5C\u4E3A\u6587\u4EF6\u4E0B\u8F7D\u3002"
                : "\u8BE5\u5B58\u50A8\u9A71\u52A8\u672A\u8FD4\u56DE\u4E0B\u8F7D\u94FE\u63A5\uFF08raw_url \u4E3A\u7A7A\uFF09\u3002")
            return r.text(
              `File not found or no download link available: ${s}
${f}`,
              404,
            )
          }
        } catch (l) {
          return (
            console.error(
              `[rawRouter] Driver get failed for '${s}':`,
              l.message,
            ),
            r.text(`Download failed: ${ie(l)}`, 500)
          )
        }
    }
    if (!tn || !en)
      return r.text("Local file streaming not supported in Edge Runtime", 500)
    let a = await tn.stat(o.physical)
    if (a.isDirectory()) return r.text("Cannot download directory", 400)
    r.header("Access-Control-Allow-Origin", "*")
    let c = r.req.header("Range")
    if (c) {
      let { start: d, end: l, chunksize: u } = Vo(c, a.size),
        f = en(o.physical, { start: d, end: l })
      return (
        r.header("Content-Range", `bytes ${d}-${l}/${a.size}`),
        r.header("Accept-Ranges", "bytes"),
        r.header("Content-Length", u.toString()),
        r.header("Content-Type", "application/octet-stream"),
        r.body(f, 206)
      )
    } else {
      ;(r.header("Content-Length", a.size.toString()),
        r.header("Accept-Ranges", "bytes"))
      let d = en(o.physical)
      return r.body(d)
    }
  } catch (s) {
    return (
      console.error(`[rawRouter] Download 404 for '${i}':`, s.message),
      r.text(`Not found: ${ie(s, "file not found")}`, 404)
    )
  }
})
te()
var er = new J()
er.get("/settings", async (r) => {
  let e = await U(r.env),
    t = {
      title: "OpenListNext Serverless",
      site_title: "OpenListNext Serverless",
      version: "v4.2.3",
      announcement: "",
      pagination_type: "pagination",
      default_page_size: "20",
      allow_indexed: "false",
      allow_mounted: "true",
      robots_txt: `User-agent: *
Allow: /`,
      logo: "/logo.png",
      favicon: "/favicon.png",
      main_color: "#1890ff",
      hide_storage_details: "false",
      hide_storage_details_in_manage_page: "false",
      customize_head: "",
      customize_body: "",
      text_types:
        "txt,htm,html,xml,java,properties,sql,js,md,json,conf,ini,vue,php,py,bat,gitignore,yml,yaml,toml,Makefile,mk,dockerfile,sh,pub,lock,gradle,ts,tsx,jsx,go,rs,c,cpp,h,cs,rb,swift,kt,dart,r,m,pl,pm,lua,ex,exs",
      audio_types: "mp3,flac,ogg,m4a,wav,opus,wma,aac,aiff,ape",
      video_types:
        "mp4,mkv,avi,mov,rmvb,webm,flv,m3u8,ts,wmv,m2ts,mpg,mpeg,3gp",
      image_types:
        "jpg,tiff,jpeg,png,gif,bmp,svg,ico,webp,avif,heic,heif,raw,cr2,nef,arw,dng",
      proxy_types: "",
      proxy_ignore_headers: "",
      audio_autoplay: "false",
      video_autoplay: "false",
      readme_autorender: "true",
      filter_readme_scripts: "true",
      preview_download_by_default: "false",
      preview_archives_by_default: "false",
      share_preview_download_by_default: "false",
      share_preview_archives_by_default: "false",
      share_preview: "true",
      share_archive_preview: "true",
      hide_files: "/\\.DS_Store/i",
      link_expiration: "0",
      sign_all: "false",
      filename_char_mapping: "{}",
      forward_direct_link_params: "false",
      ignore_direct_link_params: "",
      package_download: "true",
      offline_download: "true",
      ocr_api: "",
      privacy_regs: "",
      iframe_previews: "{}",
      external_previews: "{}",
      check_down_link: "false",
      check_update: "false",
      allow_guest: "true",
      webauthn_login_enabled: "false",
      sso_login_enabled: "false",
      sso_compatibility_mode: "false",
      ldap_login_enabled: "false",
      show_disk_usage_in_plain_text: "false",
      non_efs_zip_encoding: "UTF-8",
    }
  e.settings.forEach((n) => {
    n.key &&
      n.value !== void 0 &&
      ((t[n.key] = n.value), n.key === "site_title" && (t.title = n.value))
  })
  let i = (e.users || []).find((n) => n.username === "guest")
  return (
    !!!(i && !i.disabled) || t.allow_guest === "false"
      ? (t.allow_guest = "false")
      : (t.allow_guest = "true"),
    r.json({ code: 200, message: "success", data: t })
  )
})
er.get("/archive_extensions", (r) =>
  r.json({
    code: 200,
    message: "success",
    data: [
      "zip",
      "rar",
      "7z",
      "tar",
      "gz",
      "bz2",
      "xz",
      "tar.gz",
      "tar.bz2",
      "tar.xz",
    ],
  }),
)
er.get("/offline_download_tools", (r) =>
  r.json({ code: 200, message: "success", data: [] }),
)
er.get("/plugins", async (r) => {
  let i = ((await U(r.env)).plugins || []).filter((s) => s.enabled)
  return r.json({ code: 200, message: "success", data: i })
})
function wg() {
  return [
    {
      name: "list_files",
      description: "List files and directories in OpenListNext storage",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Storage mount path" },
        },
      },
    },
    {
      name: "get_system_info",
      description: "Fetch server hardware and storage metrics",
      inputSchema: { type: "object", properties: {} },
    },
  ]
}
function xg() {
  return [
    {
      uri: "openlistnext://storage/metrics",
      name: "Storage Metrics",
      mimeType: "application/json",
      description: "Current storage metrics of OpenListNext",
    },
  ]
}
function _g() {
  return [
    {
      name: "summarize_directory",
      description: "Prompt to summarize contents of a folder",
      arguments: [
        { name: "path", description: "The folder path", required: !0 },
      ],
    },
  ]
}
function w0(r, e, t) {
  switch (r) {
    case "tools/list":
      return { jsonrpc: "2.0", result: { tools: wg() }, id: e }
    case "resources/list":
      return { jsonrpc: "2.0", result: { resources: xg() }, id: e }
    case "prompts/list":
      return { jsonrpc: "2.0", result: { prompts: _g() }, id: e }
    default:
      return {
        jsonrpc: "2.0",
        error: { code: -32601, message: "Method not found" },
        id: e,
      }
  }
}
Ge()
var Gr = new J()
Gr.use("*", ke)
Gr.get(
  "/sse",
  (r) => (
    r.header("Content-Type", "text/event-stream"),
    r.header("Cache-Control", "no-cache"),
    r.header("Connection", "keep-alive"),
    r.text(`event: endpoint
data: /api/mcp/messages

`)
  ),
)
Gr.post("/messages", async (r) => {
  let e = await r.req.json().catch(() => ({})),
    { method: t, id: i, params: s } = e
  if (!t)
    return r.json(
      {
        jsonrpc: "2.0",
        error: { code: -32600, message: "Invalid Request" },
        id: i || null,
      },
      400,
    )
  let n = w0(t, i, s),
    o = n.error ? 404 : 200
  return r.json(n, o)
})
te()
Qs()
var Jo = new J()
Jo.get("/info", async (r) => {
  let e = await Tt(r),
    t = await U(r.env),
    i = {
      runtime: "Cloudflare Workers / Edge",
      timestamp: new Date().toISOString(),
    }
  return (
    e &&
      (i.db_state = {
        storages_count: t.storages?.length || 0,
        users_count: t.users?.length || 0,
        metas_count: t.metas?.length || 0,
        settings_count: t.settings?.length || 0,
      }),
    r.json({
      code: 200,
      message: "OpenListNext debug profile generated",
      data: i,
    })
  )
})
te()
Ge()
var we = new J()
we.use("/list", ke)
we.use("/get", ke)
we.use("/update", ke)
we.use("/delete", ke)
we.use("/cancel", ke)
we.use("/enable", ke)
we.use("/disable", ke)
we.get("/list", async (r) => {
  let e = await U(r.env)
  return r.json({
    code: 200,
    message: "success",
    data: { content: e.shares || [], total: (e.shares || []).length },
  })
})
we.get("/get", async (r) => {
  let e = r.req.query("id") || "",
    i = ((await U(r.env)).shares || []).find((s) => s.id === e)
  return i
    ? r.json({ code: 200, message: "success", data: i })
    : r.json({ code: 404, message: "share not found", data: null })
})
we.post("/create", async (r) => {
  let e = await Y(r)
  if (!e) return r.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let t = await r.req.json().catch(() => ({})),
    i = await U(r.env),
    s = t.id && String(t.id).trim() !== "" ? String(t.id).trim() : vg()
  if ((i.shares || []).some((o) => o.id === s))
    return r.json({ code: 400, message: "share id already exists", data: null })
  let n = {
    id: s,
    new_id: t.new_id || s,
    creator: e.username || "user",
    creator_role: e.role ?? 1,
    accessed: 0,
    expires: t.expires || null,
    pwd: t.pwd || "",
    max_accessed: t.max_accessed ?? 0,
    disabled: t.disabled ?? !1,
    order_by: t.order_by || "",
    order_direction: t.order_direction || "",
    extract_folder: t.extract_folder || "",
    files: t.files || [],
    remark: t.remark || "",
    readme: t.readme || "",
    header: t.header || "",
  }
  return (
    i.shares || (i.shares = []),
    i.shares.push(n),
    await $(i, r.env),
    r.json({ code: 200, message: "success", data: n })
  )
})
function vg() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16)
}
we.post("/update", async (r) => {
  let e = await r.req.json().catch(() => ({})),
    t = await U(r.env)
  if (!e.id)
    return r.json({ code: 400, message: "share id is required", data: null })
  let i = (t.shares || []).findIndex((n) => n.id === e.id)
  if (i === -1)
    return r.json({ code: 404, message: "share not found", data: null })
  let s =
    e.new_id && String(e.new_id).trim() !== "" ? String(e.new_id).trim() : e.id
  return s !== e.id && (t.shares || []).some((o) => o.id === s && o.id !== e.id)
    ? r.json({ code: 400, message: "share id already exists", data: null })
    : ((t.shares[i] = {
        ...t.shares[i],
        id: s,
        new_id: s,
        expires: e.expires !== void 0 ? e.expires : t.shares[i].expires,
        pwd: e.pwd !== void 0 ? e.pwd : t.shares[i].pwd,
        max_accessed:
          e.max_accessed !== void 0 ? e.max_accessed : t.shares[i].max_accessed,
        disabled: e.disabled !== void 0 ? e.disabled : t.shares[i].disabled,
        order_by: e.order_by !== void 0 ? e.order_by : t.shares[i].order_by,
        order_direction:
          e.order_direction !== void 0
            ? e.order_direction
            : t.shares[i].order_direction,
        extract_folder:
          e.extract_folder !== void 0
            ? e.extract_folder
            : t.shares[i].extract_folder,
        files: e.files !== void 0 ? e.files : t.shares[i].files,
        remark: e.remark !== void 0 ? e.remark : t.shares[i].remark,
        readme: e.readme !== void 0 ? e.readme : t.shares[i].readme,
        header: e.header !== void 0 ? e.header : t.shares[i].header,
      }),
      await $(t, r.env),
      r.json({ code: 200, message: "success", data: null }))
})
we.post("/delete", async (r) => {
  let e = r.req.query("id") || "",
    t = await U(r.env)
  return (
    t.shares || (t.shares = []),
    (t.shares = t.shares.filter((i) => i.id !== e)),
    await $(t, r.env),
    r.json({ code: 200, message: "success", data: null })
  )
})
we.post("/enable", async (r) => {
  let e = r.req.query("id") || "",
    t = await U(r.env),
    i = (t.shares || []).find((s) => s.id === e)
  return (
    i && ((i.disabled = !1), await $(t, r.env)),
    r.json({ code: 200, message: "success", data: null })
  )
})
we.post("/disable", async (r) => {
  let e = r.req.query("id") || "",
    t = await U(r.env),
    i = (t.shares || []).find((s) => s.id === e)
  return (
    i && ((i.disabled = !0), await $(t, r.env)),
    r.json({ code: 200, message: "success", data: null })
  )
})
te()
Ge()
var Se = new J()
Se.all("/refresh", ke, async (r) => {
  let e = await U(r.env),
    t = 0,
    i = 0,
    s = []
  for (let n of e.storages || [])
    if (!n.disabled)
      try {
        ;(await (await ee(n.driver, n)).init?.(),
          (n.status = "work"),
          t++,
          s.push({
            id: n.id,
            mount_path: n.mount_path,
            driver: n.driver,
            status: "ok",
          }))
      } catch (o) {
        ;(i++,
          s.push({
            id: n.id,
            mount_path: n.mount_path,
            driver: n.driver,
            status: "failed",
            error: o?.message || String(o),
          }))
      }
  return (
    await $(e, r.env),
    r.json({
      code: 200,
      message: "token refresh executed",
      data: {
        refreshed: t,
        failed: i,
        total: e.storages?.length || 0,
        results: s,
      },
    })
  )
})
var Rt = { upload: [], copy: [], move: [], offline_download: [] }
Se.use("*", ke)
Se.get("/:type/:state", (r) => {
  let e = r.req.param("type"),
    t = r.req.param("state"),
    s = (Rt[e] || []).filter((n) => (t === "done" ? n.done : !n.done))
  return r.json({ code: 200, message: "success", data: s })
})
Se.post("/:type/clear_done", (r) => {
  let e = r.req.param("type")
  return (
    Rt[e] && (Rt[e] = Rt[e].filter((t) => !t.done)),
    r.json({ code: 200, message: "success", data: null })
  )
})
Se.post("/:type/clear_succeeded", (r) => {
  let e = r.req.param("type")
  return (
    Rt[e] && (Rt[e] = Rt[e].filter((t) => t.state !== "succeeded")),
    r.json({ code: 200, message: "success", data: null })
  )
})
Se.post("/:type/retry_failed", (r) =>
  r.json({ code: 200, message: "success", data: null }),
)
Se.post("/:type/retry", (r) =>
  r.json({ code: 200, message: "success", data: null }),
)
Se.post("/:type/retry_some", (r) =>
  r.json({ code: 200, message: "success", data: null }),
)
Se.post("/:type/cancel", (r) =>
  r.json({ code: 200, message: "success", data: null }),
)
Se.post("/:type/cancel_some", (r) =>
  r.json({ code: 200, message: "success", data: null }),
)
Se.post("/:type/delete", (r) =>
  r.json({ code: 200, message: "success", data: null }),
)
Se.post("/:type/delete_some", (r) =>
  r.json({ code: 200, message: "success", data: null }),
)
var Vr = new Map(),
  tr = new Map()
function bg(r) {
  return (
    r.req.header("CF-Connecting-IP") ||
    r.req.header("x-real-ip") ||
    r.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  )
}
function kg() {
  let r = Date.now()
  if (Vr.size > 2e4) for (let [e, t] of Vr) r - t.start > 6e4 && Vr.delete(e)
  if (tr.size > 2e4) for (let [e, t] of tr) r - t.start > 36e5 && tr.delete(e)
}
async function Sg(r, e) {
  let t = bg(r),
    i = Date.now(),
    s = 0,
    n = 0
  try {
    let o = await U(r.env),
      a = {}
    for (let c of o.settings || []) a[c.key] = c.value
    ;((s = parseInt(a.ip_limit, 10) || 0),
      (n = parseInt(a.traffic_limit, 10) || 0))
  } catch {}
  if ((kg(), s > 0)) {
    let o = Vr.get(t)
    if (!o || i - o.start > 6e4) Vr.set(t, { start: i, count: 1 })
    else if (((o.count += 1), o.count > s))
      return r.json(
        { code: 429, message: "Too many requests, slow down", data: null },
        429,
      )
  }
  if (n > 0) {
    let o = tr.get(t),
      a = n * 1024 * 1024
    if (o && i - o.start <= 36e5 && o.bytes >= a)
      return r.json(
        { code: 429, message: "Traffic limit exceeded", data: null },
        429,
      )
  }
  if (
    (await e(),
    (r.req.query("token") || r.req.query("access_token")) &&
      (r.res?.headers?.set("Referrer-Policy", "no-referrer"),
      r.res?.headers?.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate",
      ),
      r.res?.headers?.set("Pragma", "no-cache")),
    n > 0)
  ) {
    let o = parseInt(r.res?.headers?.get("content-length") || "0", 10) || 0
    if (o > 0) {
      let a = tr.get(t)
      !a || i - a.start > 36e5
        ? tr.set(t, { start: i, bytes: o })
        : (a.bytes += o)
    }
  }
}
function x0(r) {
  ;(r.use("*", Sg),
    r.use("*", async (e, t) => {
      ;(await t(),
        e.res.headers.set("X-Frame-Options", "DENY"),
        e.res.headers.set("X-Content-Type-Options", "nosniff"),
        e.res.headers.set(
          "Content-Security-Policy",
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; media-src 'self' blob:; frame-ancestors 'none'",
        ),
        e.res.headers.set(
          "Strict-Transport-Security",
          "max-age=31536000; includeSubDomains",
        ),
        e.res.headers.set("Referrer-Policy", "no-referrer"))
    }),
    r.use(
      "*",
      za({
        origin: (e, t) => {
          if (!e) return e
          let n = (
            (t.env || {}).ALLOWED_ORIGINS ||
            (typeof process < "u" ? process.env?.ALLOWED_ORIGINS : "") ||
            ""
          )
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean)
          if (n.length > 0) return n.includes(e) ? e : null
          let o = t.req.header("host") || ""
          try {
            if (new URL(e).host === o) return e
          } catch {}
          return null
        },
        allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        exposeHeaders: ["Content-Length", "Content-Type"],
        maxAge: 600,
        credentials: !0,
      }),
    ),
    r.route("/raw", Xe),
    r.route("/fs", he),
    r.route("/auth", Qe),
    r.route("/public", er),
    r.route("/admin", z),
    r.route("/mcp", Gr),
    r.route("/debug", Jo),
    r.route("/share", we),
    r.route("/task", Se),
    r.route("/d", Xe),
    r.route("/sd", Xe),
    r.route("/p", Xe),
    r.route("/me", Kr),
    r.get("/me", Go),
    r.post("/me/update", Wo),
    r.post("/user/update_pwd", g0),
    r.get("/logout", Wr),
    r.post("/logout", Wr),
    r.get("/health", (e) =>
      e.json({
        ok: !0,
        name: "OpenListNext",
        version: "v4.2.3",
        environment: e.env?.ENVIRONMENT || "development",
      }),
    ))
}
te()
var Ut = new J()
Ut.use("*", async (r, e) => {
  ;(Cn(r.env), await e())
})
var _0 = new J()
x0(_0)
Ut.route("/api", _0)
Ut.route("/d", Xe)
Ut.route("/sd", Xe)
Ut.route("/p", Xe)
var Qo = null
function v0(r) {
  Qo = r
}
Ut.all("*", async (r) => {
  let e = r.env
  if (e && e.ASSETS && typeof e.ASSETS.fetch == "function") {
    let t = new URL(r.req.url),
      i = await e.ASSETS.fetch(r.req.raw)
    if (i.status !== 404) {
      if (t.pathname === "/" || t.pathname === "/index.html") {
        let n = new Headers(i.headers)
        return (
          n.set("Cache-Control", "no-cache, must-revalidate"),
          new Response(i.body, { status: i.status, headers: n })
        )
      }
      return i
    }
    let s = new Request(`${t.origin}/index.html`, r.req.raw)
    return e.ASSETS.fetch(s)
  }
  return Qo && (r.req.method === "GET" || r.req.method === "HEAD")
    ? r.body(Qo, 200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, must-revalidate",
      })
    : r.text("404 Not Found", 404)
})
var b0 = Ut
var k0 = `<!doctype html>
<html lang="en" translate="no">
  <head>
    <!-- customize head -->
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="referrer" content="same-origin" />
    <meta name="generator" content="OpenListNext" />
    <meta name="theme-color" content="#000000" />
    <meta name="google" content="notranslate" />
    <link href="/manifest.json" rel="manifest" crossorigin="use-credentials" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="OpenListNext" />
    <link rel="apple-touch-icon" href="/logo.png" />
    <link rel="shortcut icon" type="image/png" href="/favicon.png" />
    <title>Loading...</title>
    <script>
      window.OPENLISTNEXT_CONFIG = {
        cdn: undefined,
        base_path: undefined,
        api: undefined,
        main_color: undefined,
      }
    </script>
    <script type="module" crossorigin src="/assets/index-DB9i6pfM.js"></script>
    <link rel="modulepreload" crossorigin href="/assets/rolldown-runtime-Dd_uD5pT.js">
    <link rel="modulepreload" crossorigin href="/assets/entry-C-vFq8kc.js">
    <link rel="modulepreload" crossorigin href="/assets/entry-veOK7k_L.js">
    <link rel="modulepreload" crossorigin href="/assets/preload-helper-Czpn1I53.js">
    <link rel="modulepreload" crossorigin href="/assets/store-CIJK1zqX.js">
    <link rel="modulepreload" crossorigin href="/assets/lib-yFKjkZCS.js">
    <link rel="modulepreload" crossorigin href="/assets/fi-BgSF7Hrg.js">
    <link rel="modulepreload" crossorigin href="/assets/micromark-factory-space-C61DdfyV.js">
    <link rel="modulepreload" crossorigin href="/assets/lib-BI7MA2me.js">
    <link rel="modulepreload" crossorigin href="/assets/components-Rig3QVwZ.js">
    <link rel="modulepreload" crossorigin href="/assets/archive-DWS1gHM1.js">
    <link rel="stylesheet" crossorigin href="/assets/components-DFUx0M5w.css">
    <link rel="stylesheet" crossorigin href="/assets/index-CEjh6L5N.css">
    <script type="module">import'data:text/javascript,if(!import.meta.resolve)throw Error("import.meta.resolve not supported")';import.meta.url;import("_").catch(()=>1);(async function*(){})().next();window.__vite_is_modern_browser=true</script>
    <script type="module">!function(){if(window.__vite_is_modern_browser)return;console.warn("vite: loading legacy chunks, syntax error above and the same error below should be ignored");var e=document.getElementById("vite-legacy-polyfill"),n=document.createElement("script");n.src=e.src,n.onload=function(){System.import(document.getElementById('vite-legacy-entry').getAttribute('data-src'))},document.body.appendChild(n)}();</script>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>

    <!-- customize body -->
    <script nomodule>!function(){var e=document,t=e.createElement("script");if(!("noModule"in t)&&"onbeforeload"in t){var n=!1;e.addEventListener("beforeload",(function(e){if(e.target===t)n=!0;else if(!e.target.hasAttribute("nomodule")||!n)return;e.preventDefault()}),!0),t.type="module",t.src=".",e.head.appendChild(t),t.remove()}}();</script>
    <script nomodule crossorigin id="vite-legacy-polyfill" src="/assets/polyfills-legacy-W3AHIlJa.js"></script>
    <script nomodule crossorigin id="vite-legacy-entry" data-src="/assets/index-legacy-BSUR1J-b.js">System.import(document.getElementById('vite-legacy-entry').getAttribute('data-src'))</script>
  </body>
</html>
`
v0(k0)
function Ag(r) {
  return b0.fetch(r.request, r.env, r)
}
var Gb = Ag
export { Gb as default, Ag as onRequest }
/*! Bundled license information:

crypto-js/ripemd160.js:
  (** @preserve
  	(c) 2012 by Cédric Mesnil. All rights reserved.
  
  	Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
  
  	    - Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
  	    - Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
  
  	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
  	*)

crypto-js/mode-ctr-gladman.js:
  (** @preserve
   * Counter block mode compatible with  Dr Brian Gladman fileenc.c
   * derived from CryptoJS.mode.CTR
   * Jan Hruby jhruby.web@gmail.com
   *)
*/
