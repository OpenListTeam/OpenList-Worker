var th = Object.create
var vn = Object.defineProperty
var rh = Object.getOwnPropertyDescriptor
var ih = Object.getOwnPropertyNames
var sh = Object.getPrototypeOf,
  nh = Object.prototype.hasOwnProperty
var gr = ((i) =>
  typeof require < "u"
    ? require
    : typeof Proxy < "u"
      ? new Proxy(i, { get: (e, t) => (typeof require < "u" ? require : e)[t] })
      : i)(function (i) {
  if (typeof require < "u") return require.apply(this, arguments)
  throw Error('Dynamic require of "' + i + '" is not supported')
})
var R = (i, e, t) => () => {
  if (t) throw t[0]
  try {
    return (i && (e = i((i = 0))), e)
  } catch (r) {
    throw ((t = [r]), r)
  }
}
var W = (i, e) => () => {
    try {
      return (e || i((e = { exports: {} }).exports, e), e.exports)
    } catch (t) {
      throw ((e = 0), t)
    }
  },
  St = (i, e) => {
    for (var t in e) vn(i, t, { get: e[t], enumerable: !0 })
  },
  oh = (i, e, t, r) => {
    if ((e && typeof e == "object") || typeof e == "function")
      for (let s of ih(e))
        !nh.call(i, s) &&
          s !== t &&
          vn(i, s, {
            get: () => e[s],
            enumerable: !(r = rh(e, s)) || r.enumerable,
          })
    return i
  }
var yr = (i, e, t) => (
  (t = i != null ? th(sh(i)) : {}),
  oh(
    e || !i || !i.__esModule
      ? vn(t, "default", { value: i, enumerable: !0 })
      : t,
    i,
  )
)
var wr,
  kn = R(() => {
    wr = class extends Error {
      res
      status
      constructor(i = 500, e) {
        ;(super(e?.message, { cause: e?.cause }),
          (this.res = e?.res),
          (this.status = i))
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
var $a,
  qa = R(() => {
    $a = Symbol()
  })
var Oa = R(() => {})
var ja,
  za = R(() => {
    Oa()
    ja = (i, e) =>
      new Response(i, {
        headers: {
          "Content-Type": e.replace(/^[^;]+/, (r) => r.toLowerCase()),
        },
      }).formData()
  })
async function ah(i, e) {
  if (!ii(i) && i.bodyCache.formData) return La(await i.bodyCache.formData, e)
  let t = ii(i) ? i.headers : i.raw.headers,
    r = await i.arrayBuffer(),
    s = ja(r, t.get("Content-Type") || "")
  ii(i) || (i.bodyCache.formData = s)
  let n = await s
  return n ? La(n, e) : {}
}
function La(i, e) {
  let t = Object.create(null)
  return (
    i.forEach((r, s) => {
      e.all || s.endsWith("[]") ? ch(t, s, r) : (t[s] = r)
    }),
    e.dot &&
      Object.entries(t).forEach(([r, s]) => {
        r.includes(".") && (dh(t, r, s), delete t[r])
      }),
    t
  )
}
var ii,
  Na,
  ch,
  dh,
  Ma = R(() => {
    za()
    ;((ii = (i) => "headers" in i),
      (Na = async (i, e = Object.create(null)) => {
        let { all: t = !1, dot: r = !1 } = e,
          o = (ii(i) ? i.headers : i.raw.headers)
            .get("Content-Type")
            ?.split(";")[0]
            .trim()
            .toLowerCase()
        return o === "multipart/form-data" ||
          o === "application/x-www-form-urlencoded"
          ? ah(i, { all: t, dot: r })
          : {}
      }))
    ;((ch = (i, e, t) => {
      i[e] !== void 0
        ? Array.isArray(i[e])
          ? i[e].push(t)
          : (i[e] = [i[e], t])
        : e.endsWith("[]")
          ? (i[e] = [t])
          : (i[e] = t)
    }),
      (dh = (i, e, t) => {
        if (/(?:^|\.)__proto__\./.test(e)) return
        let r = i,
          s = e.split(".")
        s.forEach((n, o) => {
          o === s.length - 1
            ? (r[n] = t)
            : ((!r[n] ||
                typeof r[n] != "object" ||
                Array.isArray(r[n]) ||
                r[n] instanceof File) &&
                (r[n] = Object.create(null)),
              (r = r[n]))
        })
      }))
  })
var Sn,
  Ha,
  lh,
  uh,
  si,
  Wa,
  Ka,
  ph,
  An,
  Ga,
  pt,
  ni,
  Kt,
  Pn,
  Va,
  Ja,
  Qa,
  hh,
  At = R(() => {
    ;((Sn = (i) => {
      let e = i.split("/")
      return (e[0] === "" && e.shift(), e)
    }),
      (Ha = (i) => {
        let { groups: e, path: t } = lh(i),
          r = Sn(t)
        return uh(r, e)
      }),
      (lh = (i) => {
        let e = []
        return (
          (i = i.replace(/\{[^}]+\}/g, (t, r) => {
            let s = `@${r}`
            return (e.push([s, t]), s)
          })),
          { groups: e, path: i }
        )
      }),
      (uh = (i, e) => {
        for (let t = e.length - 1; t >= 0; t--) {
          let [r] = e[t]
          for (let s = i.length - 1; s >= 0; s--)
            if (i[s].includes(r)) {
              i[s] = i[s].replace(r, e[t][1])
              break
            }
        }
        return i
      }),
      (si = {}),
      (Wa = (i, e) => {
        if (i === "*") return "*"
        let t = i.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/)
        if (t) {
          let r = `${i}#${e}`
          return (
            si[r] ||
              (t[2]
                ? (si[r] =
                    e && e[0] !== ":" && e[0] !== "*"
                      ? [r, t[1], new RegExp(`^${t[2]}(?=/${e})`)]
                      : [i, t[1], new RegExp(`^${t[2]}$`)])
                : (si[r] = [i, t[1], !0])),
            si[r]
          )
        }
        return null
      }),
      (Ka = (i, e) => {
        try {
          return e(i)
        } catch {
          return i.replace(/(?:%[0-9A-Fa-f]{2})+/g, (t) => {
            try {
              return e(t)
            } catch {
              return t
            }
          })
        }
      }),
      (ph = (i) => Ka(i, decodeURI)),
      (An = (i) => {
        let e = i.url,
          t = e.indexOf("/", e.indexOf(":") + 4),
          r = t
        for (; r < e.length; r++) {
          let s = e.charCodeAt(r)
          if (s === 37) {
            let n = e.indexOf("?", r),
              o = e.indexOf("#", r),
              a =
                n === -1
                  ? o === -1
                    ? void 0
                    : o
                  : o === -1
                    ? n
                    : Math.min(n, o),
              c = e.slice(t, a)
            return ph(c.includes("%25") ? c.replace(/%25/g, "%2525") : c)
          } else if (s === 63 || s === 35) break
        }
        return e.slice(t, r)
      }),
      (Ga = (i) => {
        let e = An(i)
        return e.length > 1 && e.at(-1) === "/" ? e.slice(0, -1) : e
      }),
      (pt = (i, e, ...t) => (
        t.length && (e = pt(e, ...t)),
        `${i?.[0] === "/" ? "" : "/"}${i}${e === "/" ? "" : `${i?.at(-1) === "/" ? "" : "/"}${e?.[0] === "/" ? e.slice(1) : e}`}`
      )),
      (ni = (i) => {
        if (i.charCodeAt(i.length - 1) !== 63 || !i.includes(":")) return null
        let e = i.split("/"),
          t = [],
          r = ""
        return (
          e.forEach((s) => {
            if (s !== "" && !/\:/.test(s)) r += "/" + s
            else if (/\:/.test(s))
              if (/\?/.test(s)) {
                t.length === 0 && r === "" ? t.push("/") : t.push(r)
                let n = s.replace("?", "")
                ;((r += "/" + n), t.push(r))
              } else r += "/" + s
          }),
          t.filter((s, n, o) => o.indexOf(s) === n)
        )
      }),
      (Kt = (i) => (i.indexOf("%") !== -1 ? Ka(i, hh) : i)),
      (Pn = (i) => (
        i.indexOf("+") !== -1 && (i = i.replace(/\+/g, " ")),
        Kt(i)
      )),
      (Va = (i, e, t) => {
        let r
        if (!t && e && e.indexOf("%") === -1 && e.indexOf("+") === -1) {
          let o = i.indexOf("?", 8)
          if (o === -1) return
          for (
            i.startsWith(e, o + 1) || (o = i.indexOf(`&${e}`, o + 1));
            o !== -1;
          ) {
            let a = i.charCodeAt(o + e.length + 1)
            if (a === 61) {
              let c = o + e.length + 2,
                d = i.indexOf("&", c)
              return Pn(i.slice(c, d === -1 ? void 0 : d))
            } else if (a == 38 || isNaN(a)) return ""
            o = i.indexOf(`&${e}`, o + 1)
          }
          if (((r = /[%+]/.test(i)), !r)) return
        }
        let s = Object.create(null)
        r ??= /[%+]/.test(i)
        let n = i.indexOf("?", 8)
        for (; n !== -1; ) {
          let o = i.indexOf("&", n + 1),
            a = i.indexOf("=", n)
          a > o && o !== -1 && (a = -1)
          let c = i.slice(n + 1, a === -1 ? (o === -1 ? void 0 : o) : a)
          if ((r && (c = Pn(c)), (n = o), c === "")) continue
          let d
          ;(a === -1
            ? (d = "")
            : ((d = i.slice(a + 1, o === -1 ? void 0 : o)), r && (d = Pn(d))),
            t
              ? ((s[c] && Array.isArray(s[c])) || (s[c] = []), s[c].push(d))
              : (s[c] ??= d))
        }
        return e ? s[e] : s
      }),
      (Ja = Va),
      (Qa = (i, e) => Va(i, e, !0)),
      (hh = decodeURIComponent))
  })
var Xa,
  Ya = R(() => {
    kn()
    qa()
    Ma()
    At()
    Xa = class {
      raw
      #t
      #e
      routeIndex = 0
      path
      bodyCache = {}
      constructor(i, e = "/", t = [[]]) {
        ;((this.raw = i), (this.path = e), (this.#e = t))
      }
      param(i) {
        return i ? this.#r(i) : this.#n()
      }
      #r(i) {
        let e = this.#e[0][this.routeIndex][1][i],
          t = this.#i(e)
        return t && Kt(t)
      }
      #n() {
        let i = {},
          e = Object.keys(this.#e[0][this.routeIndex][1])
        for (let t of e) {
          let r = this.#i(this.#e[0][this.routeIndex][1][t])
          r !== void 0 && (i[t] = Kt(r))
        }
        return i
      }
      #i(i) {
        return this.#e[1] ? this.#e[1][i] : i
      }
      query(i) {
        return Ja(this.url, i)
      }
      queries(i) {
        return Qa(this.url, i)
      }
      header(i) {
        if (i) return this.raw.headers.get(i) ?? void 0
        let e = Object.create(null)
        return (
          this.raw.headers.forEach((t, r) => {
            e[r] = t
          }),
          e
        )
      }
      async parseBody(i) {
        return Na(this, i)
      }
      #s = (i) => {
        let { bodyCache: e, raw: t } = this,
          r = e[i]
        if (r) return r
        for (let s in e)
          return e[s].then(
            (n) => (
              s === "json" && (n = JSON.stringify(n)),
              new Response(n)[i]()
            ),
          )
        return (e[i] = t[i]())
      }
      json() {
        return this.#s("text").then((i) => JSON.parse(i))
      }
      text() {
        return this.#s("text")
      }
      arrayBuffer() {
        return this.#s("arrayBuffer")
      }
      bytes() {
        return this.#s("arrayBuffer").then((i) => new Uint8Array(i))
      }
      blob() {
        return this.#s("blob")
      }
      formData() {
        return this.#s("formData")
      }
      addValidatedData(i, e) {
        ;(this.#t ??= {})[i] = e
      }
      valid(i) {
        return this.#t?.[i]
      }
      get url() {
        return this.raw.url
      }
      get method() {
        return this.raw.method
      }
      get [$a]() {
        return this.#e
      }
      get matchedRoutes() {
        return this.#e[0].map(([[, i]]) => i)
      }
      get routePath() {
        return this.#e[0].map(([[, i]]) => i)[this.routeIndex].path
      }
    }
  })
var Za,
  fh,
  Cn,
  ec = R(() => {
    ;((Za = { Stringify: 1, BeforeStream: 2, Stream: 3 }),
      (fh = (i, e) => {
        let t = new String(i)
        return ((t.isEscaped = !0), (t.callbacks = e), t)
      }),
      (Cn = async (i, e, t, r, s) => {
        typeof i == "object" &&
          !(i instanceof String) &&
          (i instanceof Promise || (i = i.toString()),
          i instanceof Promise && (i = await i))
        let n = i.callbacks
        if (!n?.length) return Promise.resolve(i)
        s ? (s[0] += i) : (s = [i])
        let o = Promise.all(
          n.map((a) => a({ phase: e, buffer: s, context: r })),
        ).then((a) =>
          Promise.all(a.filter(Boolean).map((c) => Cn(c, e, !1, r, s))).then(
            () => s[0],
          ),
        )
        return t ? fh(await o, n) : o
      }))
  })
var mh,
  Tn,
  xr,
  Dn,
  oi = R(() => {
    Ya()
    ec()
    ;((mh = "text/plain; charset=UTF-8"),
      (Tn = (i, e) => ({ "Content-Type": i, ...e })),
      (xr = (i, e) => new Response(i, e)),
      (Dn = class {
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
        #p
        constructor(i, e) {
          ;((this.#t = i),
            e &&
              ((this.#i = e.executionCtx),
              (this.env = e.env),
              (this.#d = e.notFoundHandler),
              (this.#p = e.path),
              (this.#u = e.matchResult)))
        }
        get req() {
          return ((this.#e ??= new Xa(this.#t, this.#p, this.#u)), this.#e)
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
          return (this.#s ||= xr(null, {
            headers: (this.#a ??= new Headers()),
          }))
        }
        set res(i) {
          if (this.#s && i) {
            i = xr(i.body, i)
            for (let [e, t] of this.#s.headers.entries())
              if (e !== "content-type")
                if (e === "set-cookie") {
                  let r = this.#s.headers.getSetCookie()
                  i.headers.delete("set-cookie")
                  for (let s of r) i.headers.append("set-cookie", s)
                } else i.headers.set(e, t)
          }
          ;((this.#s = i), (this.finalized = !0))
        }
        render = (...i) => ((this.#c ??= (e) => this.html(e)), this.#c(...i))
        setLayout = (i) => (this.#l = i)
        getLayout = () => this.#l
        setRenderer = (i) => {
          this.#c = i
        }
        header = (i, e, t) => {
          this.finalized && (this.#s = xr(this.#s.body, this.#s))
          let r = this.#s ? this.#s.headers : (this.#a ??= new Headers())
          e === void 0 ? r.delete(i) : t?.append ? r.append(i, e) : r.set(i, e)
        }
        status = (i) => {
          this.#n = i
        }
        set = (i, e) => {
          ;((this.#r ??= new Map()), this.#r.set(i, e))
        }
        get = (i) => (this.#r ? this.#r.get(i) : void 0)
        get var() {
          return this.#r ? Object.fromEntries(this.#r) : {}
        }
        #o(i, e, t) {
          let r = this.#s ? new Headers(this.#s.headers) : this.#a
          if (typeof e == "object" && e.headers) {
            r ??= new Headers()
            for (let [n, o] of new Headers(e.headers))
              n === "set-cookie" ? r.append(n, o) : r.set(n, o)
          }
          if (t) {
            if (!r) {
              let n = 0
              for (let o in t)
                if (++n > 1 || typeof t[o] != "string") {
                  r = new Headers()
                  break
                }
            }
            if (r)
              for (let n in t) {
                let o = t[n]
                if (typeof o == "string") r.set(n, o)
                else {
                  r.delete(n)
                  for (let a of o) r.append(n, a)
                }
              }
          }
          let s = typeof e == "number" ? e : (e?.status ?? this.#n)
          return xr(i, { status: s, headers: r ?? t })
        }
        newResponse = (...i) => this.#o(...i)
        body = (i, e, t) => this.#o(i, e, t)
        text = (i, e, t) =>
          !this.#a && !this.#n && !e && !t && !this.finalized
            ? new Response(i)
            : this.#o(i, e, Tn(mh, t))
        json = (i, e, t) =>
          this.#o(JSON.stringify(i), e, Tn("application/json", t))
        html = (i, e, t) => {
          let r = (s) => this.#o(s, e, Tn("text/html; charset=UTF-8", t))
          return typeof i == "object"
            ? Cn(i, Za.Stringify, !1, {}).then(r)
            : r(i)
        }
        redirect = (i, e) => {
          let t = String(i)
          return (
            this.header("Location", /[^\x00-\xFF]/.test(t) ? encodeURI(t) : t),
            this.newResponse(null, e ?? 302)
          )
        }
        notFound = () => ((this.#d ??= () => xr()), this.#d(this))
      }))
  })
var Rc = W((Bw, Ic) => {
  "use strict"
  var Ln = Object.defineProperty,
    _h = Object.getOwnPropertyDescriptor,
    vh = Object.getOwnPropertyNames,
    bh = Object.prototype.hasOwnProperty,
    kh = (i, e) => {
      for (var t in e) Ln(i, t, { get: e[t], enumerable: !0 })
    },
    Ph = (i, e, t, r) => {
      if ((e && typeof e == "object") || typeof e == "function")
        for (let s of vh(e))
          !bh.call(i, s) &&
            s !== t &&
            Ln(i, s, {
              get: () => e[s],
              enumerable: !(r = _h(e, s)) || r.enumerable,
            })
      return i
    },
    Sh = (i) => Ph(Ln({}, "__esModule", { value: !0 }), i),
    bc = {}
  kh(bc, {
    InvalidKeyError: () => hi,
    InvalidStoreNameError: () => Ar,
    MissingProjectIdError: () => kc,
    PagesBlobError: () => Ke,
    PreconditionFailedError: () => On,
    QuotaExceededError: () => Ah,
    RateLimitedError: () => Ch,
    Store: () => Pc,
    getStore: () => Kh,
    listStores: () => Gh,
  })
  Ic.exports = Sh(bc)
  var Ke = class extends Error {
      code
      constructor(i, e) {
        ;(super(`PagesBlob: ${e}`),
          (this.name = "PagesBlobError"),
          (this.code = i))
      }
    },
    hi = class extends Ke {
      constructor(i) {
        super("INVALID_KEY", i)
      }
    },
    Ar = class extends Ke {
      constructor(i) {
        super("INVALID_STORE_NAME", i)
      }
    },
    Un = class extends Ke {
      constructor(i) {
        super(
          "MISSING_ENVIRONMENT",
          `Environment not configured for Pages Blob. Missing: ${i.join(", ")}. Supply these properties when creating a store, or ensure the function is running in a Pages environment.`,
        )
      }
    },
    Ah = class extends Ke {
      constructor() {
        super("QUOTA_EXCEEDED", "storage quota exceeded")
      }
    },
    Ch = class extends Ke {
      constructor() {
        super("RATE_LIMITED", "request rate limited, please retry later")
      }
    },
    kc = class extends Ke {
      constructor() {
        super(
          "MISSING_PROJECT_ID",
          "projectId is required when using API token mode. Please supply { name, projectId, token } to getStore() / listStores().",
        )
      }
    },
    ft = class extends Ke {
      constructor(i) {
        super("CREDENTIAL_ERROR", i)
      }
    },
    ye = class extends Ke {
      constructor(i, e) {
        super("COS_ERROR", `COS returned ${i}: ${e}`)
      }
    },
    On = class extends Ke {
      constructor() {
        super(
          "PRECONDITION_FAILED",
          "conditional write failed (key already exists)",
        )
      }
    }
  function Tt(i) {
    if (i === "") throw new hi("Blob key must not be empty.")
    if (i.startsWith("/") || i.startsWith("%2F"))
      throw new hi("Blob key must not start with forward slash (/).")
    if (new TextEncoder().encode(i).length > 600)
      throw new hi(
        "Blob key must be a sequence of Unicode characters whose UTF-8 encoding is at most 600 bytes long.",
      )
  }
  function Th(i) {
    if (i === "") throw new Ar("Store name must not be empty.")
    if (i.includes("/") || i.includes(":"))
      throw new Ar(
        "Store name must not contain forward slashes (/) or colons (:).",
      )
    if (!/^[a-zA-Z0-9_-]+$/.test(i))
      throw new Ar(
        "Store name must only contain letters, digits, underscores, and hyphens.",
      )
    if (new TextEncoder().encode(i).length > 64)
      throw new Ar(
        "Store name must be a sequence of Unicode characters whose UTF-8 encoding is at most 64 bytes long.",
      )
  }
  var Pc = class {
      cosClient
      storeName
      defaultConsistency
      constructor(i, e, t = "eventual") {
        ;((this.cosClient = i),
          (this.storeName = e),
          (this.defaultConsistency = t))
      }
      resolveConsistency(i) {
        return i ?? this.defaultConsistency
      }
      async set(i, e, t) {
        Tt(i)
        let r = await this.cosClient.putObject(this.storeName, i, e, {
          onlyIfNew: t?.onlyIfNew,
          cacheControl: t?.cacheControl,
        })
        if (t?.onlyIfNew && r.statusCode === 412) throw new On()
      }
      async setJSON(i, e, t) {
        Tt(i)
        let r = JSON.stringify(e),
          s = await this.cosClient.putObject(this.storeName, i, r, {
            onlyIfNew: t?.onlyIfNew,
            contentType: "application/json",
            cacheControl: t?.cacheControl,
          })
        if (t?.onlyIfNew && s.statusCode === 412) throw new On()
      }
      async createUploadUrl(i, e) {
        Tt(i)
        let { url: t, expiresAt: r } =
          await this.cosClient.createPresignedPutUrl(this.storeName, i, {
            expireSeconds: e?.expireSeconds,
            contentType: e?.contentType,
          })
        return { url: t, key: i, expiresAt: r }
      }
      async get(i, e) {
        Tt(i)
        let t = this.resolveConsistency(e?.consistency),
          r = await this.cosClient.getObject(this.storeName, i, t)
        if (r === null) return null
        let { body: s } = r,
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
      async getMetadata(i, e) {
        Tt(i)
        let t = this.resolveConsistency(e?.consistency)
        return this.cosClient.headObject(this.storeName, i, t)
      }
      async getWithHeaders(i, e) {
        Tt(i)
        let t = this.resolveConsistency(e?.consistency),
          r = await this.cosClient.getObject(this.storeName, i, t)
        return r
          ? {
              body: new TextDecoder("utf-8").decode(r.body),
              headers: r.headers || {},
            }
          : null
      }
      async delete(i) {
        ;(Tt(i), await this.cosClient.deleteObject(this.storeName, i))
      }
      async list(i) {
        let e = i?.paginate !== !1,
          t = i?.limit,
          r = [],
          s = [],
          n = this.resolveConsistency(i?.consistency),
          o = i?.cursor || "",
          a = !0,
          c
        for (; a; ) {
          let d = t !== void 0 ? t - r.length : 1e3,
            l = Math.min(d, 1e3)
          if (l <= 0) break
          let u = await this.cosClient.listObjects(this.storeName, {
            prefix: i?.prefix,
            delimiter: i?.directories ? "/" : void 0,
            marker: o || void 0,
            maxKeys: l,
            consistency: n,
          })
          for (let p of u.contents) r.push({ key: p.key, etag: p.etag })
          ;(s.push(...u.commonPrefixes),
            t !== void 0 && r.length >= t
              ? ((r.length = t),
                (u.isTruncated || u.contents.length === l) &&
                  (c = u.nextMarker),
                (a = !1))
              : u.isTruncated
                ? !e && t === void 0
                  ? ((c = u.nextMarker), (a = !1))
                  : (o = u.nextMarker)
                : (a = !1))
        }
        return { blobs: r, directories: s, ...(c ? { cursor: c } : {}) }
      }
    },
    Dh = new TextEncoder()
  function jn(i) {
    let e = Dh.encode(i),
      t = new ArrayBuffer(e.byteLength),
      r = new Uint8Array(t)
    return (r.set(e), r)
  }
  function Sc(i) {
    let e = i instanceof Uint8Array ? i : new Uint8Array(i),
      t = ""
    for (let r = 0; r < e.length; r++) t += e[r].toString(16).padStart(2, "0")
    return t
  }
  async function fc(i, e) {
    let t = await crypto.subtle.importKey(
        "raw",
        jn(i),
        { name: "HMAC", hash: "SHA-1" },
        !1,
        ["sign"],
      ),
      r = await crypto.subtle.sign("HMAC", t, jn(e))
    return Sc(r)
  }
  async function Eh(i) {
    let e = await crypto.subtle.digest("SHA-1", jn(i))
    return Sc(e)
  }
  function fi(i) {
    return encodeURIComponent(i).replace(
      /[!'()*]/g,
      (e) => "%" + e.charCodeAt(0).toString(16).toUpperCase(),
    )
  }
  function mi(i) {
    try {
      return decodeURIComponent(i)
    } catch {
      return i
    }
  }
  function Ac(i) {
    return i
      .split("/")
      .map((e) => mi(e))
      .join("/")
  }
  function Cc(i) {
    return i
      .split("/")
      .map((e) => fi(mi(e)))
      .join("/")
  }
  var Fh = new Set([
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
  function Ih(i) {
    return i === "host" || i === "x-cos-security-token"
      ? !1
      : !!(Fh.has(i) || i.startsWith("x-cos-"))
  }
  function mc(i) {
    if (!i) return []
    let e = []
    for (let [t, r] of Object.entries(i))
      r != null && e.push([t.toLowerCase(), String(r)])
    return (e.sort(([t], [r]) => (t < r ? -1 : t > r ? 1 : 0)), e)
  }
  function gc(i) {
    return i.map(([e, t]) => `${fi(e)}=${fi(t)}`).join("&")
  }
  function yc(i) {
    return i.map(([e]) => fi(e)).join(";")
  }
  async function Tc(i) {
    let e = i.method.toLowerCase(),
      t = i.pathname.startsWith("/") ? i.pathname : `/${i.pathname}`,
      r = Math.floor(Date.now() / 1e3),
      s = r + (i.expireSeconds ?? 3600),
      n = `${r};${s}`,
      o = mc(i.headers).filter(([y]) => Ih(y)),
      a = yc(o),
      c = gc(o),
      d = mc(i.query),
      l = yc(d),
      u = gc(d),
      p = `${e}
${t}
${u}
${c}
`,
      h = `sha1
${n}
${await Eh(p)}
`,
      f = await fc(i.secretKey, n),
      g = await fc(f, h),
      w = [
        "q-sign-algorithm=sha1",
        `q-ak=${i.secretId}`,
        `q-sign-time=${n}`,
        `q-key-time=${n}`,
        `q-header-list=${a}`,
        `q-url-param-list=${l}`,
        `q-signature=${g}`,
      ].join("&"),
      m = {}
    for (let [y, v] of o) m[y] = v
    return { authorization: w, signedHeaders: m }
  }
  async function Rh(i) {
    let e = new URL(i.domain),
      t = mi(i.key),
      r = `/${Ac(t)}`,
      s = `/${Cc(t)}`
    e.pathname = s
    let { authorization: n } = await Tc({
      method: i.method,
      pathname: r,
      query: i.query,
      headers: i.headers,
      secretId: i.credential.secretId,
      secretKey: i.credential.secretKey,
      expireSeconds: i.expireSeconds,
    })
    if (i.query)
      for (let [o, a] of Object.entries(i.query))
        a != null && e.searchParams.set(o, String(a))
    for (let o of n.split("&")) {
      let a = o.indexOf("=")
      if (a === -1) continue
      let c = o.slice(0, a),
        d = o.slice(a + 1)
      e.searchParams.set(c, d)
    }
    return (
      i.credential.sessionToken &&
        e.searchParams.set("x-cos-security-token", i.credential.sessionToken),
      e.toString()
    )
  }
  async function vr(i) {
    let e = new URL(i.domain),
      t = i.key ? mi(i.key) : "",
      r = t ? `/${Ac(t)}` : "/",
      s = t ? `/${Cc(t)}` : "/"
    if (((e.pathname = s), i.query))
      for (let [u, p] of Object.entries(i.query))
        p != null && e.searchParams.set(u, String(p))
    let { authorization: n } = await Tc({
        method: i.method,
        pathname: r,
        query: i.query,
        headers: i.headers,
        secretId: i.credential.secretId,
        secretKey: i.credential.secretKey,
      }),
      o = new Headers()
    if (i.headers)
      for (let [u, p] of Object.entries(i.headers))
        p != null && o.set(u, String(p))
    ;(o.set("Authorization", n),
      i.credential.sessionToken &&
        o.set("x-cos-security-token", i.credential.sessionToken))
    let a = e.toString(),
      c = {
        method: i.method,
        headers: o,
        body: i.body ?? void 0,
        signal: i.signal,
      },
      d = 2,
      l
    for (let u = 0; u <= d; u++)
      try {
        return await fetch(a, c)
      } catch (p) {
        if (((l = p), p instanceof DOMException && p.name === "AbortError"))
          throw p
        u < d && (await new Promise((h) => setTimeout(h, 1e3 * (u + 1))))
      }
    throw l
  }
  var Bh = "blob.edgeone.site",
    Uh = "blob-nocache.edgeone.site",
    Dc = class Oe {
      credentialManager
      bucket = ""
      region = ""
      keyPrefix = ""
      cachedDomain = ""
      uncachedDomain = ""
      initialized = !1
      static buildErrorDetail(e, t, r, s, n) {
        let o = r ? `${t}/${r}` : t,
          a = n ? ` [request-id: ${n}]` : ""
        return `${e} ${o} - ${$h(s)}${a}`
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
          let r = e.resourcePrefix
            .replace(/\/?\*$/, "")
            .split("/")
            .filter(Boolean)
          if (r.length >= 2) return r.slice(0, Math.min(r.length, 3)).join("-")
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
          r = e.cosMainland,
          s = e.cosOverseas,
          n = t ? r || s : s || r
        !this.bucket &&
          n &&
          ((this.bucket = n.bucket), (this.region = n.region))
        let o = this.computeSubdomain(e)
        if (!o)
          throw new ye(
            0,
            "unable to derive tenant subdomain from credential; missing appId/zoneId/projectId or resourcePrefix",
          )
        ;((this.cachedDomain = `https://${o}.${Bh}`),
          (this.uncachedDomain = `https://${o}.${Uh}`),
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
      async putObject(e, t, r, s) {
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
          let l = await vr({
            domain: n,
            method: "PUT",
            key: a,
            headers: d,
            body: r,
            credential: o,
          })
          if (l.status === 412)
            return (
              await l.arrayBuffer().catch(() => {}),
              { etag: "", statusCode: 412 }
            )
          if (!l.ok) {
            let p = await br(l)
            throw new ye(
              l.status,
              Oe.buildErrorDetail(
                "PUT",
                n,
                a,
                p || `status ${l.status}`,
                kr(l),
              ),
            )
          }
          let u = l.headers.get("etag") || ""
          return (
            await l.arrayBuffer().catch(() => {}),
            { etag: u, statusCode: l.status }
          )
        } catch (l) {
          throw l instanceof ye
            ? l
            : new ye(0, Oe.buildErrorDetail("PUT", n, a, Pr(l)))
        }
      }
      async createPresignedPutUrl(e, t, r) {
        let s = await this.resolveDomain("strong"),
          n = await this.resolveCredential(),
          o = this.buildCosKey(e, t),
          a = {}
        r?.contentType && (a["Content-Type"] = r.contentType)
        let c = r?.expireSeconds ?? 3600,
          d = await Rh({
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
      async getObject(e, t, r) {
        let s = await this.resolveDomain(r),
          n = await this.resolveCredential(),
          o = this.buildCosKey(e, t)
        try {
          let a = await vr({ domain: s, method: "GET", key: o, credential: n })
          if (a.status === 404)
            return (await a.arrayBuffer().catch(() => {}), null)
          if (!a.ok) {
            let l = await br(a)
            throw new ye(
              a.status,
              Oe.buildErrorDetail(
                "GET",
                s,
                o,
                l || `status ${a.status}`,
                kr(a),
              ),
            )
          }
          let c = new Uint8Array(await a.arrayBuffer()),
            d = wc(a.headers)
          return { body: c, contentType: d["content-type"], headers: d }
        } catch (a) {
          throw a instanceof ye
            ? a
            : new ye(0, Oe.buildErrorDetail("GET", s, o, Pr(a)))
        }
      }
      async headObject(e, t, r) {
        let s = await this.resolveDomain(r),
          n = await this.resolveCredential(),
          o = this.buildCosKey(e, t)
        try {
          let a = await vr({ domain: s, method: "HEAD", key: o, credential: n })
          if (a.status === 404) return null
          if (!a.ok) {
            let d = await br(a)
            throw new ye(
              a.status,
              Oe.buildErrorDetail(
                "HEAD",
                s,
                o,
                d || `status ${a.status}`,
                kr(a),
              ),
            )
          }
          let c = wc(a.headers)
          return {
            cacheControl: c["cache-control"],
            contentType: c["content-type"],
            etag: c.etag,
            headers: c,
          }
        } catch (a) {
          throw a instanceof ye
            ? a
            : new ye(0, Oe.buildErrorDetail("HEAD", s, o, Pr(a)))
        }
      }
      async deleteObject(e, t) {
        let r = await this.resolveDomain("strong"),
          s = await this.resolveCredential(),
          n = this.buildCosKey(e, t)
        try {
          let o = await vr({
            domain: r,
            method: "DELETE",
            key: n,
            credential: s,
          })
          if (o.status === 204 || o.status === 404 || o.ok) {
            await o.arrayBuffer().catch(() => {})
            return
          }
          let a = await br(o)
          throw new ye(
            o.status,
            Oe.buildErrorDetail(
              "DELETE",
              r,
              n,
              a || `status ${o.status}`,
              kr(o),
            ),
          )
        } catch (o) {
          throw o instanceof ye
            ? o
            : new ye(0, Oe.buildErrorDetail("DELETE", r, n, Pr(o)))
        }
      }
      async listObjects(e, t) {
        await this.ensureInitialized()
        let r = `${this.keyPrefix}/${e}/`,
          s = t?.prefix ? r + t.prefix : r,
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
                l = d.startsWith(r) ? d.slice(r.length) : d
              return l ? { key: l, etag: c.etag } : null
            })
            .filter((c) => c !== null),
          a = n.commonPrefixes
            .map((c) => (c.startsWith(r) ? c.slice(r.length) : c))
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
          r = "",
          s = !0
        for (; s; ) {
          await this.ensureInitialized()
          let n = `${this.keyPrefix}/`,
            o = await this.getBucketRaw({
              prefix: n,
              delimiter: "/",
              maxKeys: 1e3,
              marker: r || void 0,
              consistency: e,
            })
          for (let a of o.commonPrefixes) {
            let c = a.startsWith(n) ? a.slice(n.length, -1) : a.slice(0, -1)
            c && t.push(c)
          }
          if (((s = o.isTruncated), (r = o.nextMarker), !s || !r)) break
        }
        return t
      }
      async getBucketRaw(e) {
        let t = await this.resolveDomain(e.consistency),
          r = await this.resolveCredential(),
          s = { prefix: e.prefix }
        ;(e.delimiter && (s.delimiter = e.delimiter),
          e.marker && (s.marker = e.marker),
          e.maxKeys && (s["max-keys"] = e.maxKeys))
        try {
          let n = await vr({
            domain: t,
            method: "GET",
            query: s,
            credential: r,
          })
          if (!n.ok) {
            let a = await br(n)
            throw new ye(
              n.status,
              Oe.buildErrorDetail(
                "LIST",
                t,
                e.prefix,
                a || `status ${n.status}`,
                kr(n),
              ),
            )
          }
          let o = await n.text()
          return qh(o)
        } catch (n) {
          throw n instanceof ye
            ? n
            : new ye(0, Oe.buildErrorDetail("LIST", t, e.prefix, Pr(n)))
        }
      }
    }
  function $h(i) {
    return i
      .replace(
        /[a-zA-Z0-9\-]+\.cos\.[a-zA-Z0-9\-.]+\.myqcloud\.com/gi,
        "[cos-origin]",
      )
      .replace(
        /[a-zA-Z0-9\-]+\.cos\.[a-zA-Z0-9\-.]+\.tencentcos\.cn/gi,
        "[cos-origin]",
      )
  }
  async function br(i) {
    try {
      return await i.text()
    } catch {
      return ""
    }
  }
  function kr(i) {
    return (
      i.headers.get("x-cos-request-id") ||
      i.headers.get("x-eo-log-id") ||
      void 0
    )
  }
  function Pr(i) {
    let e = i,
      t = e.message || String(i),
      r = e.cause
    if (r) {
      let s = r.message || r.code || ""
      return s ? `${t} (${s})` : t
    }
    return t
  }
  function wc(i) {
    let e = {}
    return (
      i.forEach((t, r) => {
        e[r.toLowerCase()] = t
      }),
      e
    )
  }
  function qh(i) {
    let e = [],
      t = /<Contents>([\s\S]*?)<\/Contents>/g,
      r
    for (; (r = t.exec(i)) !== null; ) {
      let c = r[1],
        d = Sr(c, "Key"),
        l = Sr(c, "ETag")
      d !== null && e.push({ key: $n(d), etag: l || "" })
    }
    let s = [],
      n = /<CommonPrefixes>([\s\S]*?)<\/CommonPrefixes>/g
    for (; (r = n.exec(i)) !== null; ) {
      let c = r[1],
        d = Sr(c, "Prefix")
      d !== null && s.push($n(d))
    }
    let o = Sr(i, "IsTruncated") === "true",
      a = Sr(i, "NextMarker") || ""
    return { contents: e, commonPrefixes: s, isTruncated: o, nextMarker: $n(a) }
  }
  function Sr(i, e) {
    let t = new RegExp(`<${e}>([\\s\\S]*?)<\\/${e}>`).exec(i)
    return t ? t[1] : null
  }
  function $n(i) {
    return i
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&")
  }
  var Oh = "X-RateLimit-Reset"
  async function zn(i, e, t = 2) {
    e.signal?.throwIfAborted?.()
    try {
      let r = await fetch(i, e)
      if (t > 0 && (r.status === 429 || r.status >= 500)) {
        let s = xc(r.headers.get(Oh))
        return (await _c(s, e.signal), zn(i, e, t - 1))
      }
      return r
    } catch (r) {
      if (t === 0 || (r instanceof DOMException && r.name === "AbortError"))
        throw r
      let s = xc()
      return (await _c(s, e.signal), zn(i, e, t - 1))
    }
  }
  function xc(i) {
    return i ? Math.max(Number(i) * 1e3 - Date.now(), 500) : 1500
  }
  function _c(i, e) {
    return new Promise((t, r) => {
      if (e?.aborted) return r(e.reason)
      let s = setTimeout(() => {
          ;(e?.removeEventListener("abort", n), t())
        }, i),
        n = () => {
          ;(clearTimeout(s), r(e.reason))
        }
      e?.addEventListener("abort", n, { once: !0 })
    })
  }
  var jh = "prod"
  function zh() {
    let i = typeof process < "u" ? process.env.PAGES_BLOB_STS_ENV : void 0
    return i === "test" || i === "prod" ? i : jh
  }
  var Lh = 300,
    Nh = "https://blob-sts.edgeone.site/",
    Ec = class {
      authToken
      projectId
      cached = null
      constructor(i, e) {
        ;((this.authToken = i), (this.projectId = e))
      }
      async getCredential() {
        if (this.cached && !this.isExpired(this.cached)) return this.cached
        let i = await this.fetchCredential()
        return ((this.cached = i), i)
      }
      clearCache() {
        this.cached = null
      }
      isExpired(i) {
        let e = Math.floor(Date.now() / 1e3)
        return i.expiredTime - e < Lh
      }
      async fetchCredential() {
        for (let i = 1; i <= 3; i++) {
          let e = new AbortController(),
            t = setTimeout(() => e.abort(), 1e4),
            r
          try {
            r = await zn(Nh, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.authToken}`,
                "X-Env": zh(),
              },
              body: JSON.stringify(
                this.projectId ? { ProjectId: this.projectId } : {},
              ),
              signal: e.signal,
            })
          } catch (o) {
            if (i < 3) {
              await qn(500 * i)
              continue
            }
            throw new ft(
              `failed to obtain STS credential: ${o.message || "timeout"}`,
            )
          } finally {
            clearTimeout(t)
          }
          if (r.status === 413) throw new ft("storage quota exceeded")
          if (r.status === 429) throw new ft("rate limited, please retry later")
          if (!r.ok) {
            if (r.status >= 500 && i < 3) {
              await qn(500 * i)
              continue
            }
            let o = await r.text().catch(() => "unknown error")
            throw new ft(`failed to obtain STS credential: ${r.status} ${o}`)
          }
          let s = await r.json(),
            n = s.data && typeof s.data == "object" ? s.data : s
          if (
            n.tmpSecretId &&
            n.tmpSecretKey &&
            n.sessionToken &&
            n.expiredTime
          ) {
            let o = n.cosMainland,
              a = n.cosOverseas,
              c = r.headers.get("X-Edge-Region") || void 0
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
            throw new ft(`credential exchange failed (code=${n.code}): ${o}`)
          }
          if (s.code !== void 0 && s.code !== 0) {
            let o = s.msg || s.message || "unknown error"
            throw new ft(`credential exchange failed (code=${s.code}): ${o}`)
          }
          if (i < 3) {
            await qn(500 * i)
            continue
          }
          throw new ft("invalid STS credential response")
        }
        throw new ft("invalid STS credential response")
      }
    }
  function qn(i) {
    return new Promise((e) => setTimeout(e, i))
  }
  var Mh = "{{PAGES_BLOB_DEPLOY_CREDENTIAL}}"
  function Hh() {
    let i = {},
      e = Wh()
    if (e) i.deployCredential = e
    else {
      let r = vc("PAGES_BLOB_DEPLOY_CREDENTIAL")
      r && (i.deployCredential = r)
    }
    let t = vc("PAGES_PROJECT_ID")
    return (t && (i.projectId = t), i)
  }
  function Wh() {
    let i = Mh
    if (!(i.startsWith("{{") && i.endsWith("}}"))) return i || void 0
  }
  function vc(i) {
    if (typeof process < "u" && process.env) return process.env[i]
  }
  function Kh(i) {
    let e = typeof i == "string" ? i : i.name
    Th(e)
    let t = Fc(typeof i == "string" ? void 0 : i),
      r = new Ec(t.authToken, t.projectId),
      s = new Dc(r)
    return new Pc(s, e, t.consistency ?? "eventual")
  }
  async function Gh(i) {
    let e = Fc(
        i
          ? {
              name: "__list__",
              projectId: i.projectId,
              token: i.token,
              consistency: i.consistency,
            }
          : void 0,
      ),
      t = new Ec(e.authToken, e.projectId)
    return {
      stores: (await new Dc(t).listStores(e.consistency)).map((r) => ({
        name: r,
      })),
    }
  }
  function Fc(i) {
    let e = Hh(),
      t = i?.token || e.deployCredential,
      r = i?.projectId || e.projectId
    if (i?.token || e.projectId) {
      if (!r) throw new kc()
      if (!t) throw new Un(["token"])
      return { authToken: t, projectId: r, consistency: i?.consistency }
    }
    if (i?.projectId && !t) throw new Un(["token"])
    if (!e.deployCredential) throw new Un(["deployCredential"])
    return { authToken: e.deployCredential, consistency: i?.consistency }
  }
})
var Wn = {}
St(Wn, {
  defaultDb: () => Tr,
  getDb: () => $,
  getKvBinding: () => _i,
  getKvStatus: () => Hn,
  getMetas: () => ef,
  getPlugins: () => tf,
  getSettings: () => Xh,
  getStorages: () => Zh,
  getUsers: () => Yh,
  resolvePath: () => de,
  saveDb: () => j,
  setEnvCtx: () => Mn,
})
async function Vh() {
  if (Bc) return gi
  Bc = !0
  try {
    let { getStore: i } = await Promise.resolve().then(() => yr(Rc(), 1))
    gi = i({ name: "openlistnext_db", consistency: "strong" })
  } catch {
    gi = null
  }
  return gi
}
function $c() {
  Uc ||
    ((Uc = !0),
    !(typeof process > "u" || typeof process.on != "function") &&
      process.on("uncaughtException", (i) => {
        ;(i?.message?.includes("RESP") ||
          i?.message?.includes("Unknown type") ||
          i?.stack?.includes("processResponses")) &&
          console.error(
            "[KV/RESP] Caught uncaught exception from storage binding, continuing:",
            i.message,
          )
      }))
}
function Mn(i) {
  i && (Cr = i)
}
async function _i(i) {
  i && (Cr = i)
  let e = i || Cr || (typeof process < "u" ? process.env : {}),
    t = typeof globalThis < "u" ? globalThis : {}
  try {
    let c = await Vh()
    if (c)
      return (
        $c(),
        {
          binding: c,
          platform: "EdgeOne Blob (@edgeone/pages-blob, strong consistency)",
          mode: "blob",
        }
      )
  } catch {}
  let r =
      (e && (e.EDGEONE_KV_NAME || e.KV_NAMESPACE || e.KV_NAME)) ||
      t.EDGEONE_KV_NAME ||
      t.KV_NAMESPACE,
    s = [
      ...(r ? [{ key: r, name: r }] : []),
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
      l && $c()
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
async function qc(i, e = "openlistnext_config") {
  let { binding: t, mode: r } = i
  if (r === "none" || !t) return null
  try {
    if (r === "blob") {
      let s = await t.get(e, { type: "json" })
      if (s) return s
      let n = await t.get(e)
      if (n) return typeof n == "string" ? JSON.parse(n) : n
    } else if (r === "binding") {
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
async function Jh(i, e, t) {
  let { binding: r, mode: s } = i
  if (s === "none" || !r) return !1
  let n = JSON.stringify(t)
  try {
    if (s === "blob") {
      if (typeof r.setJSON == "function") return (await r.setJSON(e, t), !0)
      if (typeof r.set == "function") return (await r.set(e, n), !0)
    } else if (s === "binding") {
      if (typeof r.put == "function") return (await r.put(e, n), !0)
      if (typeof r.set == "function") return (await r.set(e, n), !0)
    } else if (r.type === "cf_rest") {
      let o = `https://api.cloudflare.com/client/v4/accounts/${r.accountId}/storage/kv/namespaces/${r.namespaceId}/values/${e}`
      return (
        await fetch(o, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${r.token}`,
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
async function Hn(i) {
  let e = await _i(i),
    t = e.mode !== "none",
    r = !1,
    s = null
  if (t)
    try {
      let n = await qc(e, "openlistnext_config")
      return (
        (r = !0),
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
    connected: r,
    platform: e.platform,
    mode: e.mode,
    hasData: !1,
    error: s,
  }
}
async function de(i) {
  let e = await $(),
    t = []
  for (let a of String(i || "").split("/"))
    if (!(a === "" || a === ".")) {
      if (a === "..") {
        t.pop()
        continue
      }
      t.push(a)
    }
  let r = "/" + t.join("/")
  r === "" && (r = "/")
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
    if (d || r === c || r.startsWith(c + "/")) {
      let u = r
      ;(d || (u = r.slice(c.length)), u.startsWith("/") || (u = "/" + u))
      let p = {}
      try {
        p =
          typeof a.addition == "string"
            ? JSON.parse(a.addition || "{}")
            : a.addition || {}
      } catch {
        p = {}
      }
      let f = p.root_folder_path !== void 0 ? p.root_folder_path : "/",
        w = (
          [f, u]
            .map((m) => m.replace(/\\/g, "/"))
            .filter((m) => !!m && m !== "/")
            .join("/") || "/"
        ).replace(/\/{2,}/g, "/")
      return {
        storage: a,
        relative: u,
        physical: w,
        rootFolder: f,
        cleanPath: r,
        isVirtual: !1,
      }
    }
  }
  let o = !1
  for (let a of s) {
    let c = "/" + (a.mount_path || "").split("/").filter(Boolean).join("/")
    if (c !== "/" && c.startsWith(r === "/" ? "/" : r + "/")) {
      o = !0
      break
    }
  }
  if (o)
    return {
      storage: null,
      relative: r,
      physical: null,
      rootFolder: null,
      cleanPath: r,
      isVirtual: !0,
    }
  throw new Error("failed get storage: storage not found")
}
async function Xh() {
  let i = await $(),
    e = {}
  return (
    i.settings &&
      i.settings.forEach((t) => {
        e[t.key] = t.value
      }),
    e
  )
}
async function Yh() {
  return (await $()).users || []
}
async function Zh() {
  return (await $()).storages || []
}
async function ef() {
  return (await $()).metas || []
}
async function tf() {
  return (await $()).plugins || []
}
var Tr,
  Z,
  Cr,
  gi,
  Bc,
  Uc,
  Qh,
  Nn,
  yi,
  wi,
  xi,
  $,
  j,
  ne = R(() => {
    "use strict"
    ;((Tr = {
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
      (Z = null),
      (Cr = null),
      (gi = null),
      (Bc = !1))
    Uc = !1
    ;((Qh = {
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
      (Nn = (i) => {
        if (!i) return
        i.settings || (i.settings = [])
        let e = !1,
          t = [],
          r = new Set()
        for (let s of Tr.settings) {
          r.add(s.key)
          let n = i.settings.filter((o) => o.key === s.key)
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
            let a = Qh[s.key]
            ;(a && a.from.includes(o.value) && ((o.value = a.to), (e = !0)),
              t.push(o))
          }
        }
        for (let s of i.settings)
          s.key && !r.has(s.key) && (r.add(s.key), t.push(s))
        ;(e || t.length !== i.settings.length) &&
          ((i.settings = t), j(i).catch(() => {}))
      }),
      (yi = (i) => {
        i &&
          (!i.storages || !Array.isArray(i.storages)
            ? (i.storages = [])
            : (i.storages = i.storages.filter(
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
      (wi = (i) => {
        i && (i.shares || (i.shares = []))
      }),
      (xi = (i) => {
        i && (i.plugins || (i.plugins = []))
      }),
      ($ = async (i) => {
        i && (Cr = i)
        let e = await _i(i)
        if (e.mode !== "none")
          try {
            let t = await qc(e, "openlistnext_config")
            if (t) return ((Z = t), Nn(Z), yi(Z), wi(Z), xi(Z), Z)
          } catch (t) {
            console.error("[DB] Error reading config from KV:", t)
          }
        if (Z) return (Nn(Z), yi(Z), wi(Z), xi(Z), Z)
        if (typeof process < "u" && process.env && process.env.DATABASE_JSON)
          try {
            return (
              (Z = JSON.parse(process.env.DATABASE_JSON)),
              Nn(Z),
              yi(Z),
              wi(Z),
              xi(Z),
              Z
            )
          } catch (t) {
            console.error("Failed to parse DATABASE_JSON env variable:", t)
          }
        return ((Z = JSON.parse(JSON.stringify(Tr))), yi(Z), wi(Z), xi(Z), Z)
      }),
      (j = async (i, e) => {
        ;(e && (Cr = e), (Z = i))
        let t = await _i(e)
        t.mode !== "none"
          ? (await Jh(t, "openlistnext_config", i).catch(
              (s) => (console.error("[DB] Failed to save to KV:", s), !1),
            )) &&
            console.log(
              `[DB] Successfully persisted ${i.storages?.length || 0} storages to KV (${t.platform})`,
            )
          : console.warn(
              "[DB] WARNING: No KV binding found! Storage configuration changes will exist only in memory!",
            )
      }))
  })
function z(i, e) {
  if (e) return 1
  let t = (i.split(".").pop() || "").toLowerCase()
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
var ee = R(() => {
  "use strict"
})
function N(i, e, t) {
  let r = t !== "desc",
    s = String(e || "name").toLowerCase(),
    n = [...i]
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
        r ? c : -c
      )
    }),
    n
  )
}
var ie = R(() => {
  "use strict"
})
var Ge,
  Kn = R(() => {
    "use strict"
    Ge = {
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
  })
function Gn(i, e) {
  let t = ""
  return (
    i.thumbnails &&
      i.thumbnails.length > 0 &&
      (t = i.thumbnails[0].medium?.url || ""),
    {
      id: i.id,
      name: i.name,
      size: i.size,
      modified:
        i.lastModifiedDateTime || i.fileSystemInfo?.lastModifiedDateTime || "",
      isFolder: !!i.folder || !i.file,
      thumbnail: t,
      parentID: e,
      url: i["@microsoft.graph.downloadUrl"] || "",
    }
  )
}
var Oc = R(() => {
  "use strict"
})
async function Vn(i) {
  if (i.use_online_api && i.api_url_address) {
    let n = new URLSearchParams({
        refresh_ui: i.refresh_token,
        server_use: "true",
        driver_txt: "onedrive_pr",
      }).toString(),
      a = await (await fetch(`${i.api_url_address}?${n}`)).json()
    if (!a.refresh_token || !a.access_token)
      throw a.text
        ? new Error(`failed to refresh token: ${a.text}`)
        : new Error("empty token returned from official API")
    ;((i.accessToken = a.access_token),
      (i.refresh_token = a.refresh_token),
      i.onTokenUpdate?.(i.refresh_token))
    return
  }
  if (!i.client_id || !i.client_secret)
    throw new Error("empty ClientID or ClientSecret")
  let t = `${(Ge[i.region] || Ge.global).oauth}/common/oauth2/v2.0/token`,
    s = await (
      await fetch(t, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: i.client_id,
          client_secret: i.client_secret,
          redirect_uri: i.redirect_uri,
          refresh_token: i.refresh_token,
        }).toString(),
      })
    ).json()
  if (!s.refresh_token) throw new Error("Empty token")
  ;((i.refresh_token = s.refresh_token),
    (i.accessToken = s.access_token),
    i.onTokenUpdate?.(i.refresh_token))
}
async function De(i, e, t, r, s) {
  let n = {
      method: t.toUpperCase(),
      headers: {
        Authorization: `Bearer ${i.accessToken}`,
        ...(r !== void 0 ? { "Content-Type": "application/json" } : {}),
      },
      ...(r !== void 0 ? { body: JSON.stringify(r) } : {}),
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
      return (await Vn(i), De(i, e, t, r, !0))
    throw new Error(a?.message || `Request failed: ${o.status}`)
  }
  if (o.status !== 204) return o.json()
}
function jc(i, e, t) {
  let r = e.replace(/\\/g, "/")
  if (!r || r === "/") return t ? `${i}/drive/root/${t}` : `${i}/drive/root`
  let s = r.startsWith("/") ? r.slice(1) : r
  if ((s.endsWith("/") && (s = s.slice(0, -1)), !s || s === ""))
    return t ? `${i}/drive/root/${t}` : `${i}/drive/root`
  let n = s.split("/").map(encodeURIComponent).join("/")
  return t ? `${i}/drive/root:/${n}:/${t}` : `${i}/drive/root:/${n}:`
}
async function zc(i, e) {
  let t = Ge[i.region] || Ge.global,
    r = i.is_sharepoint
      ? `${t.api}/v1.0/sites/${i.site_id}`
      : `${t.api}/v1.0/me`,
    n = jc(
      r,
      e,
      "children?$top=1000&$expand=thumbnails($select=medium)&$select=id,name,size,fileSystemInfo,@microsoft.graph.downloadUrl,file,folder,parentReference",
    ),
    o = []
  for (; n; ) {
    let a = await De(i, n, "GET")
    ;(a.value && o.push(...a.value), (n = a["@odata.nextLink"]))
  }
  return o
}
async function Lc(i, e) {
  let t = Ge[i.region] || Ge.global,
    r = i.is_sharepoint
      ? `${t.api}/v1.0/sites/${i.site_id}`
      : `${t.api}/v1.0/me`,
    s = jc(r, e)
  return De(i, s, "GET")
}
var Nc = R(() => {
  "use strict"
  Kn()
})
var vi,
  Mc = R(() => {
    "use strict"
    ie()
    Kn()
    Oc()
    Nc()
    vi = class {
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
            (this.use_online_api =
              this.use_online_api.toLowerCase() === "true"),
          typeof this.chunk_size == "string" &&
            (this.chunk_size = parseInt(this.chunk_size) || 5),
          typeof this.disable_disk_usage == "string" &&
            (this.disable_disk_usage =
              this.disable_disk_usage.toLowerCase() === "true"),
          typeof this.enable_direct_upload == "string" &&
            (this.enable_direct_upload =
              this.enable_direct_upload.toLowerCase() === "true"),
          this.chunk_size < 1 && (this.chunk_size = 5),
          this.refresh_token && (await Vn(this)))
      }
      getMetaUrl(e, t, r) {
        let s = Ge[this.region] || Ge.global
        if (e) return s.oauth
        let n = this.is_sharepoint
            ? `${s.api}/v1.0/sites/${this.site_id}`
            : `${s.api}/v1.0/me`,
          o = t.replace(/\\/g, "/")
        if (!o || o === "/")
          return r ? `${n}/drive/root/${r}` : `${n}/drive/root`
        let a = o.startsWith("/") ? o.slice(1) : o
        if ((a.endsWith("/") && (a = a.slice(0, -1)), !a || a === ""))
          return r ? `${n}/drive/root/${r}` : `${n}/drive/root`
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
        return r ? `${n}/drive/root:/${c}:/${r}` : `${n}/drive/root:/${c}:`
      }
      async list(e, t) {
        let s = (await zc(this, t)).map((n) => {
          let o = Gn(n, ""),
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
        return N(s, this.order_by, this.order_direction)
      }
      async get(e, t) {
        let r = await Lc(this, t),
          s = Gn(r, ""),
          n = r["@microsoft.graph.downloadUrl"] || s.url || ""
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
        let r = t.split("/").slice(0, -1).join("/") || "/",
          s = t.split("/").filter(Boolean).pop() || "",
          n = this.getMetaUrl(!1, r, "children")
        await De(this, n, "POST", {
          name: s,
          folder: {},
          "@microsoft.graph.conflictBehavior": "rename",
        })
      }
      async rename(e, t, r) {
        let s = { name: r },
          n = this.getMetaUrl(!1, t)
        await De(this, n, "PATCH", s)
      }
      async remove(e, t, r) {
        for (let s of r) {
          let n = t === "/" ? `/${s}` : `${t}/${s}`,
            o = this.getMetaUrl(!1, n)
          await De(this, o, "DELETE")
        }
      }
      async move(e, t, r, s, n) {
        let o = this.getMetaUrl(!1, n),
          a = await De(this, o, "GET"),
          c = a.id,
          d = a.parentReference?.driveId
        for (let l of r) {
          let u = s === "/" ? `/${l}` : `${s}/${l}`,
            p = {
              parentReference: { id: c, ...(d ? { driveId: d } : {}) },
              name: l,
            },
            h = this.getMetaUrl(!1, u)
          await De(this, h, "PATCH", p)
        }
      }
      async copy(e, t, r, s, n) {
        let o = this.getMetaUrl(!1, n),
          a = await De(this, o, "GET"),
          c = a.id,
          d = a.parentReference?.driveId
        for (let l of r) {
          let u = s === "/" ? `/${l}` : `${s}/${l}`,
            p = {
              parentReference: { id: c, ...(d ? { driveId: d } : {}) },
              name: l,
            },
            h = this.getMetaUrl(!1, u, "copy")
          await De(this, h, "POST", p)
        }
      }
      async put(e, t, r) {
        if (r.length <= 4 * 1024 * 1024) {
          let s = this.getMetaUrl(!1, t, "content")
          await De(this, s, "PUT", r)
        } else {
          let s = this.getMetaUrl(!1, t, "createUploadSession"),
            a = (
              await De(this, s, "POST", {
                item: { "@microsoft.graph.conflictBehavior": "rename" },
              })
            ).uploadUrl,
            c = this.chunk_size * 1024 * 1024,
            d = 0,
            l = r.length
          for (; d < l; ) {
            let u = l - d,
              p = Math.min(u, c),
              h = r.slice(d, d + p)
            ;(await fetch(a, {
              method: "PUT",
              headers: {
                "Content-Length": String(p),
                "Content-Range": `bytes ${d}-${d + p - 1}/${l}`,
              },
              body: h,
            }),
              (d += p))
          }
        }
      }
    }
  })
function Jn(i, e) {
  let t = ""
  return (
    i.thumbnails &&
      i.thumbnails.length > 0 &&
      (t = i.thumbnails[0].medium?.url || ""),
    {
      id: i.id,
      name: i.name,
      size: i.size,
      modified:
        i.lastModifiedDateTime || i.fileSystemInfo?.lastModifiedDateTime || "",
      isFolder: !!i.folder || !i.file,
      thumbnail: t,
      parentID: e,
      url: i["@microsoft.graph.downloadUrl"] || "",
    }
  )
}
var Hc = R(() => {
  "use strict"
})
var Dt,
  Wc = R(() => {
    "use strict"
    Dt = {
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
  })
function Ee(i, e, t, r) {
  let s = Dt[i.region] || Dt.global
  if (e) return s.oauth
  let n = t ? t.replace(/\\/g, "/") : ""
  if (!n || n === "/")
    return r
      ? `${s.api}/v1.0/users/${i.email}/drive/root/${r}`
      : `${s.api}/v1.0/users/${i.email}/drive/root`
  let o = n.startsWith("/") ? n.slice(1) : n
  if ((o.endsWith("/") && (o = o.slice(0, -1)), !o || o === ""))
    return r
      ? `${s.api}/v1.0/users/${i.email}/drive/root/${r}`
      : `${s.api}/v1.0/users/${i.email}/drive/root`
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
  return r
    ? `${s.api}/v1.0/users/${i.email}/drive/root:/${a}:/${r}`
    : `${s.api}/v1.0/users/${i.email}/drive/root:/${a}:`
}
async function Qn(i) {
  let e = null
  for (let t = 0; t < 3; t++)
    try {
      await rf(i)
      return
    } catch (r) {
      e = r
    }
  throw e || new Error("Failed to get access token")
}
async function rf(i) {
  if (!i.client_id || !i.client_secret)
    throw new Error("empty client_id or client_secret")
  if (!i.tenant_id) throw new Error("empty tenant_id")
  let e = Dt[i.region] || Dt.global,
    t = `${e.oauth}/${i.tenant_id}/oauth2/token`,
    r = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: i.client_id,
      client_secret: i.client_secret,
      resource: `${e.api}/`,
      scope: `${e.api}/.default`,
    }).toString(),
    n = await (
      await fetch(t, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: r,
      })
    ).json()
  if (n.error) throw new Error(n.error_description || n.error)
  if (!n.access_token)
    throw new Error("empty token returned from Microsoft identity platform")
  ;((i.accessToken = n.access_token), i.onTokenUpdate?.(i.accessToken))
}
async function _e(i, e, t, r, s) {
  let n =
      r !== void 0 &&
      (typeof r == "string" ||
        r instanceof Uint8Array ||
        r instanceof ArrayBuffer ||
        (typeof Buffer < "u" && Buffer.isBuffer(r))),
    o = {
      method: t.toUpperCase(),
      headers: {
        Authorization: `Bearer ${i.accessToken}`,
        ...(r !== void 0 && !n ? { "Content-Type": "application/json" } : {}),
      },
      ...(r !== void 0 ? { body: n ? r : JSON.stringify(r) } : {}),
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
      return (await Qn(i), _e(i, e, t, r, !0))
    throw new Error(c?.message || `Request failed: ${a.status}`)
  }
  if (a.status !== 204) return a.json()
}
async function Kc(i, e) {
  let r = Ee(
      i,
      !1,
      e,
      "children?$top=1000&$expand=thumbnails($select=medium)&$select=id,name,size,fileSystemInfo,lastModifiedDateTime,@microsoft.graph.downloadUrl,file,folder,parentReference",
    ),
    s = []
  for (; r; ) {
    let n = await _e(i, r, "GET")
    ;(n.value && s.push(...n.value), (r = n["@odata.nextLink"]))
  }
  return s
}
async function Gc(i, e) {
  let t = Ee(i, !1, e)
  return _e(i, t, "GET")
}
async function Vc(i) {
  let t = `${(Dt[i.region] || Dt.global).api}/v1.0/users/${i.email}/drive`
  return _e(i, t, "GET", void 0, !0)
}
async function Jc(i, e) {
  let t = Ee(i, !1, e, "createUploadSession"),
    n = (
      await _e(i, t, "POST", {
        item: { "@microsoft.graph.conflictBehavior": "rename" },
      })
    ).uploadUrl
  if (!n) throw new Error("failed to get upload URL from response")
  return {
    UploadURL: n,
    ChunkSize: (i.chunk_size || 5) * 1024 * 1024,
    Method: "PUT",
  }
}
var Qc = R(() => {
  "use strict"
  Wc()
})
var bi,
  Xc = R(() => {
    "use strict"
    ie()
    Hc()
    Qc()
    bi = class {
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
            (await Qn(this)))
      }
      async list(e, t) {
        let s = (await Kc(this, t)).map((n) => {
          let o = Jn(n, ""),
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
        return N(s, this.order_by, this.order_direction)
      }
      async get(e, t) {
        let r = await Gc(this, t),
          s = Jn(r, ""),
          n = r["@microsoft.graph.downloadUrl"] || s.url || ""
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
        let r = t.split("/").slice(0, -1).join("/") || "/",
          s = t.split("/").filter(Boolean).pop() || "",
          n = Ee(this, !1, r, "children")
        await _e(this, n, "POST", {
          name: s,
          folder: {},
          "@microsoft.graph.conflictBehavior": "rename",
        })
      }
      async rename(e, t, r) {
        let s = { name: r },
          n = Ee(this, !1, t)
        await _e(this, n, "PATCH", s)
      }
      async remove(e, t, r) {
        for (let s of r) {
          let n = t === "/" ? `/${s}` : `${t}/${s}`,
            o = Ee(this, !1, n)
          await _e(this, o, "DELETE")
        }
      }
      async move(e, t, r, s, n) {
        let o = Ee(this, !1, n),
          a = await _e(this, o, "GET"),
          c = a.id,
          d = a.parentReference?.driveId
        for (let l of r) {
          let u = s === "/" ? `/${l}` : `${s}/${l}`,
            p = {
              parentReference: { id: c, ...(d ? { driveId: d } : {}) },
              name: l,
            },
            h = Ee(this, !1, u)
          await _e(this, h, "PATCH", p)
        }
      }
      async copy(e, t, r, s, n) {
        let o = Ee(this, !1, n),
          a = await _e(this, o, "GET"),
          c = a.id,
          d = a.parentReference?.driveId
        for (let l of r) {
          let u = s === "/" ? `/${l}` : `${s}/${l}`,
            p = {
              parentReference: { id: c, ...(d ? { driveId: d } : {}) },
              name: l,
            },
            h = Ee(this, !1, u, "copy")
          await _e(this, h, "POST", p)
        }
      }
      async put(e, t, r) {
        if (r.length <= 4 * 1024 * 1024) {
          let s = Ee(this, !1, t, "content")
          await _e(this, s, "PUT", r)
        } else {
          let s = Ee(this, !1, t, "createUploadSession"),
            a = (
              await _e(this, s, "POST", {
                item: { "@microsoft.graph.conflictBehavior": "rename" },
              })
            ).uploadUrl,
            c = this.chunk_size * 1024 * 1024,
            d = 0,
            l = r.length
          for (; d < l; ) {
            let u = l - d,
              p = Math.min(u, c),
              h = r.slice(d, d + p)
            ;(await fetch(a, {
              method: "PUT",
              headers: {
                "Content-Length": String(p),
                "Content-Range": `bytes ${d}-${d + p - 1}/${l}`,
              },
              body: h,
            }),
              (d += p))
          }
        }
      }
      async getDetails() {
        if (this.disable_disk_usage) return {}
        let e = await Vc(this)
        return {
          total: e.quota.total,
          used: e.quota.used,
          free: e.quota.remaining,
        }
      }
      async getDirectUploadInfo(e) {
        if (!this.enable_direct_upload)
          throw new Error("Direct upload is not enabled")
        return Jc(this, e)
      }
    }
  })
var sf,
  ki,
  Yc = R(() => {
    "use strict"
    ;((sf = "https://openapi.aliyundrive.com/adrive/v1.0"),
      (ki = class {
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
            console.warn(
              "[AliyundriveOpen] refresh_token is empty, skipping init.",
            )
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
              r = e ? "resource" : this.addition.drive_type || "resource",
              s = ""
            ;(r === "resource" && t.resource_drive_id
              ? (s = t.resource_drive_id)
              : r === "backup" && t.backup_drive_id
                ? (s = t.backup_drive_id)
                : r === "default" &&
                  t.default_drive_id &&
                  (s = t.default_drive_id),
              s ||
                (s =
                  t.resource_drive_id ||
                  t.default_drive_id ||
                  t.backup_drive_id ||
                  ""),
              (this.driveId = s),
              console.log(
                `[AliyundriveOpen] Resolved drive_id: ${this.driveId} (driveType: ${r})`,
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
          let r =
            this.addition.alipan_type === "alipanTV"
              ? "alicloud_tv"
              : "alicloud_qr"
          for (let o of t)
            try {
              let a = new URLSearchParams({
                  refresh_ui: e,
                  refresh_token: e,
                  server_use: "true",
                  driver_txt: r,
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
            let o = {
              grant_type: "refresh_token",
              refresh_token: e,
              client_id: s,
            }
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
        async openApiRequest(e, t, r = !0) {
          await this.ensureToken()
          let s = e.startsWith("http") ? e : `${sf}${e}`,
            n = await fetch(s, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.accessToken}`,
              },
              body: JSON.stringify(t),
            })
          if (n.status === 401 && r)
            return (
              await this.refreshAccessToken(),
              this.openApiRequest(e, t, !1)
            )
          if (!n.ok) {
            let o = await n.text().catch(() => "")
            throw new Error(
              `[AliyundriveOpen] API error [${n.status}] ${e}: ${o}`,
            )
          }
          return n.json()
        }
        async listFiles(e) {
          this.driveId || (await this.resolveDriveId())
          let t = [],
            r,
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
            r && (o.marker = r)
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
            ;(t.push(...(a.items || [])), (r = a.next_marker || void 0))
          } while (r)
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
        async putFile(e, t, r) {
          let s = r.length,
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
          let a = await fetch(o, { method: "PUT", body: r })
          if (!a.ok)
            throw new Error(`[AliyundriveOpen] Upload failed: ${a.status}`)
          await this.openApiRequest("/openFile/complete", {
            drive_id: this.driveId,
            file_id: n.file_id,
            upload_id: n.upload_id,
          })
        }
      }))
  })
function Zc(i) {
  let e = i.type === "folder"
  return {
    name: i.name,
    size: i.size || 0,
    is_dir: e,
    modified: i.updated_at || i.created_at || new Date().toISOString(),
    sign: "",
    type: z(i.name, e),
    thumb: i.thumbnail || "",
    raw_url: i.download_url || "",
  }
}
var Pi,
  ed = R(() => {
    "use strict"
    ee()
    ie()
    Yc()
    Pi = class {
      client
      addition
      pathFileIdCache = new Map()
      constructor(e) {
        ;((this.addition = e), (this.client = new ki(e)))
      }
      async init() {
        await this.client.init()
      }
      async list(e, t) {
        let r = await this.resolveFileId(t),
          n = (await this.client.listFiles(r)).map(Zc)
        return N(n, this.addition.order_by, this.addition.order_direction)
      }
      async get(e, t) {
        let r = await this.resolveFileId(t),
          s = await this.client.getFile(r).catch(() => null),
          n = await this.client.getDownloadUrl(r).catch(() => "")
        if (s) {
          let c = Zc(s)
          return ((c.raw_url = n || c.raw_url), c)
        }
        try {
          await this.client.listFiles(r)
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
        let r = t.split("/").filter(Boolean),
          s = r.pop() || "\u65B0\u6587\u4EF6\u5939",
          n = "/" + r.join("/"),
          o = await this.resolveFileId(n)
        await this.client.mkdir(o, s)
      }
      async rename(e, t, r) {
        let s = await this.resolveFileId(t)
        await this.client.rename(s, r)
      }
      async remove(e, t, r) {
        let s = await this.resolveFileId(t)
        await this.client.remove(s)
      }
      async move(e, t, r, s, n) {
        let o = await this.resolveFileId(s),
          a = await this.resolveFileId(t)
        await this.client.move(o, a)
      }
      async copy(e, t, r, s, n) {
        let o = await this.resolveFileId(s),
          a = await this.resolveFileId(t)
        await this.client.copy(o, a)
      }
      async put(e, t, r) {
        let s = t.split("/").filter(Boolean),
          n = s.pop() || "upload",
          o = "/" + s.join("/"),
          a = await this.resolveFileId(o)
        await this.client.putFile(a, n, r)
      }
      async resolveFileId(e) {
        let t = e.split("/").filter(Boolean).join("/")
        if (!t) return this.client.getRootFolderId()
        if (this.pathFileIdCache.has(t)) return this.pathFileIdCache.get(t)
        let r = t.split("/"),
          s = this.client.getRootFolderId()
        for (let n = 0; n < r.length; n++) {
          let o = r[n],
            a = (() => {
              try {
                return decodeURIComponent(o)
              } catch {
                return o
              }
            })(),
            c = r.slice(0, n + 1).join("/")
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
  })
var Dr,
  td,
  rd,
  Xn = R(() => {
    "use strict"
    ;((Dr = "application/vnd.google-apps.folder"),
      (td = "application/vnd.google-apps.shortcut"),
      (rd =
        "files(id,name,mimeType,size,modifiedTime,createdTime,thumbnailLink,shortcutDetails,md5Checksum,sha1Checksum,sha256Checksum),nextPageToken"))
  })
var mt,
  id,
  nf,
  Si,
  sd = R(() => {
    "use strict"
    Xn()
    ;((mt = "https://www.googleapis.com/drive/v3"),
      (id = "https://www.googleapis.com/upload/drive/v3"),
      (nf = "https://oauth2.googleapis.com/token"),
      (Si = class {
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
            r = []
          t &&
            (this.addition.api_url_address?.trim() &&
              r.push(this.addition.api_url_address.trim()),
            r.push(
              "https://api.oplist.org/google/token",
              "https://api.oplist.org/google/renewapi",
              "https://api.oplist.org/googledrive/token",
              "https://api-sam.oplist.org/google/token",
              "https://api-sam.oplist.org/googledrive/token",
              "https://api.alist.nn.ci/google/token",
              "https://api.alist.nn.ci/googledrive/token",
            ))
          for (let o of r)
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
                let p = d.text || d.error || "empty access_token"
                throw new Error(p)
              }
              ;((this.accessToken = l),
                u && (this.refreshTokenVal = u),
                (this.tokenExpiresAt =
                  Date.now() + (d.expires_in || 3600) * 1e3 - 6e4))
              return
            } catch (a) {
              console.warn(
                `[GoogleDrive] Online API '${o}' failed: ${a.message}`,
              )
            }
          let s =
              (this.addition.client_id || "").trim() ||
              "202264815644-2n82p2e49c7o6026u87j9e22v1n25c27.apps.googleusercontent.com",
            n =
              (this.addition.client_secret || "").trim() ||
              "GOCSPX-4bH5Kx3s_89_j6j2x-2x3-8x"
          if (s && n)
            try {
              let o = await fetch(nf, {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
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
        async request(e, t = {}, r = !0) {
          await this.ensureToken()
          let s = await fetch(e, {
            ...t,
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              ...(t.headers || {}),
            },
          })
          if (s.status === 401 && r)
            return (
              console.warn(
                "[GoogleDrive] 401 Unauthorized, refreshing token...",
              ),
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
            r,
            s = this.addition.order_by || "folder,name,modifiedTime desc"
          do {
            let n = new URLSearchParams({
              q: `'${e}' in parents and trashed = false`,
              fields: rd,
              orderBy: s,
              pageSize: "1000",
              includeItemsFromAllDrives: "true",
              supportsAllDrives: "true",
            })
            r && n.set("pageToken", r)
            let o = `${mt}/files?${n.toString()}`,
              a = await this.request(o),
              c = a.files || []
            for (let d of c)
              d.mimeType === td &&
                d.shortcutDetails?.targetId &&
                ((d.id = d.shortcutDetails.targetId),
                (d.mimeType = d.shortcutDetails.targetMimeType || d.mimeType))
            ;(t.push(...c), (r = a.nextPageToken))
          } while (r)
          return t
        }
        async getFile(e) {
          let t = new URLSearchParams({
            fields: "id,name,mimeType,size,modifiedTime,md5Checksum",
            includeItemsFromAllDrives: "true",
            supportsAllDrives: "true",
          })
          return this.request(`${mt}/files/${e}?${t.toString()}`)
        }
        getDownloadUrl(e) {
          return `${mt}/files/${e}?includeItemsFromAllDrives=true&supportsAllDrives=true&alt=media&acknowledgeAbuse=true`
        }
        getDownloadHeaders() {
          return { Authorization: `Bearer ${this.accessToken}` }
        }
        async mkdir(e, t) {
          await this.request(`${mt}/files?supportsAllDrives=true`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: t, parents: [e], mimeType: Dr }),
          })
        }
        async rename(e, t) {
          await this.request(`${mt}/files/${e}?supportsAllDrives=true`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: t }),
          })
        }
        async remove(e) {
          await this.request(`${mt}/files/${e}?supportsAllDrives=true`, {
            method: "DELETE",
          })
        }
        async move(e, t, r) {
          let s = new URLSearchParams({
            addParents: r,
            removeParents: t,
            supportsAllDrives: "true",
          })
          await this.request(`${mt}/files/${e}?${s.toString()}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          })
        }
        async copy(e, t, r) {
          await this.request(`${mt}/files/${e}/copy?supportsAllDrives=true`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: r, parents: [t] }),
          })
        }
        async putFile(e, t, r, s = "application/octet-stream") {
          let n = (this.addition.chunk_size || 5) * 1024 * 1024
          if (r.length <= n) {
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
              p = Buffer.concat([l, r, u])
            await this.request(`${id}/files?${o.toString()}`, {
              method: "POST",
              headers: { "Content-Type": `multipart/related; boundary=${a}` },
              body: p,
            })
          } else {
            let o = new URLSearchParams({
              uploadType: "resumable",
              supportsAllDrives: "true",
            })
            await this.ensureToken()
            let a = await fetch(`${id}/files?${o.toString()}`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${this.accessToken}`,
                "Content-Type": "application/json",
                "X-Upload-Content-Type": s,
                "X-Upload-Content-Length": String(r.length),
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
            for (; d < r.length; ) {
              let l = r.slice(d, d + n),
                u = d + l.length - 1,
                p = await fetch(c, {
                  method: "PUT",
                  headers: {
                    "Content-Range": `bytes ${d}-${u}/${r.length}`,
                    "Content-Type": s,
                  },
                  body: l,
                })
              if (!p.ok && p.status !== 308)
                throw new Error(
                  `[GoogleDrive] Chunk upload failed: ${p.status}`,
                )
              d += l.length
            }
          }
        }
        pathCache = new Map()
        async resolveFileId(e) {
          let t = e.split("/").filter(Boolean).join("/")
          if (!t) return this.getRootFolderId()
          if (this.pathCache.has(t)) return this.pathCache.get(t)
          let r = t.split("/"),
            s = this.getRootFolderId()
          for (let n = 0; n < r.length; n++) {
            let o = r[n],
              a = (() => {
                try {
                  return decodeURIComponent(o)
                } catch {
                  return o
                }
              })(),
              c = r.slice(0, n + 1).join("/")
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
            r = t.pop() || "unnamed",
            s = "/" + t.join("/")
          return { parentId: await this.resolveFileId(s), name: r }
        }
      }))
  })
function nd(i) {
  return {
    name: i.name,
    size: i.size ? parseInt(i.size, 10) : 0,
    is_dir: i.mimeType === Dr,
    modified: i.modifiedTime || i.createdTime || new Date().toISOString(),
    sign: "",
    type: i.mimeType === Dr ? 1 : 0,
    thumb: i.thumbnailLink || "",
    raw_url: "",
  }
}
var Ai,
  od = R(() => {
    "use strict"
    ie()
    Xn()
    sd()
    Ai = class {
      client
      addition
      constructor(e) {
        ;((this.addition = e), (this.client = new Si(e)))
      }
      async init() {
        await this.client.init()
      }
      async list(e, t) {
        let r = await this.client.resolveFileId(t),
          n = (await this.client.listFiles(r)).map(nd)
        return N(n, this.addition.order_by, this.addition.order_direction)
      }
      async get(e, t) {
        let r = await this.client.resolveFileId(t),
          s = await this.client.getFile(r).catch(() => null)
        if (s) {
          let a = nd(s)
          return (
            (a.raw_url = this.client.getDownloadUrl(r)),
            (a.raw_url_headers = this.client.getDownloadHeaders()),
            a
          )
        }
        let n = t.split("/").filter(Boolean),
          o = n[n.length - 1] || "root"
        try {
          return (
            await this.client.listFiles(r),
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
        let { parentId: r, name: s } = await this.client.resolveParentAndName(t)
        await this.client.mkdir(r, s)
      }
      async rename(e, t, r) {
        let s = await this.client.resolveFileId(t)
        await this.client.rename(s, r)
      }
      async remove(e, t, r) {
        let s = await this.client.resolveFileId(t)
        await this.client.remove(s)
      }
      async move(e, t, r, s, n) {
        let o = await this.client.resolveFileId(s),
          a = s.split("/").filter(Boolean)
        a.pop()
        let c = await this.client.resolveFileId("/" + a.join("/")),
          d = await this.client.resolveFileId(t)
        await this.client.move(o, c, d)
      }
      async copy(e, t, r, s, n) {
        let o = await this.client.resolveFileId(s),
          a = s.split("/").filter(Boolean).pop() || "copy",
          c = await this.client.resolveFileId(t)
        await this.client.copy(o, c, a)
      }
      async put(e, t, r) {
        let { parentId: s, name: n } = await this.client.resolveParentAndName(t)
        await this.client.putFile(s, n, r)
      }
    }
  })
function cf(i = "Quark") {
  return i === "UC" ? af : of
}
function ad(i, e, t) {
  let r = i
      .split(";")
      .map((o) => o.trim())
      .filter(Boolean),
    s = r.findIndex((o) => {
      let a = o.indexOf("=")
      return a !== -1 && o.substring(0, a).trim() === e
    }),
    n = `${e}=${t}`
  return (s !== -1 ? (r[s] = n) : r.push(n), r.join("; "))
}
function cd(i, e) {
  let t = i.split(/,(?=[^;]+=[^;]+)/)
  for (let r of t) {
    let n = r.split(";")[0].trim(),
      o = n.indexOf("=")
    if (o !== -1 && n.substring(0, o).trim() === e)
      return n.substring(o + 1).trim()
  }
  return null
}
function df(i) {
  return i
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}
function lf(i) {
  let e = i.split(".").pop()?.toLowerCase() || "",
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
    r = ["mp3", "flac", "aac", "wav", "ogg", "m4a", "opus"],
    s = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "heic", "tiff"],
    n = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md"]
  return t.includes(e)
    ? "video"
    : r.includes(e)
      ? "audio"
      : s.includes(e)
        ? "image"
        : n.includes(e)
          ? "doc"
          : "others"
}
var of,
  af,
  Ci,
  dd = R(() => {
    "use strict"
    ;((of = {
      ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) quark-cloud-drive/2.5.20 Chrome/100.0.4896.160 Electron/18.3.5.4-b478491100 Safari/537.36 Channel/pckk_other_ch",
      referer: "https://pan.quark.cn",
      api: "https://drive-m.quark.cn/1/clouddrive",
      pr: "ucpro",
    }),
      (af = {
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) uc-cloud-drive/2.5.20 Chrome/100.0.4896.160 Electron/18.3.5.4-b478491100 Safari/537.36 Channel/pckk_other_ch",
        referer: "https://drive.uc.cn",
        api: "https://pc-api.uc.cn/1/clouddrive",
        pr: "UCBrowser",
      }))
    Ci = class {
      addition
      conf
      cookie
      onCookieUpdate
      constructor(e, t) {
        ;((this.addition = e),
          (this.conf = cf(e.variant || "Quark")),
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
      async request(e, t, r, s) {
        let n = new URL(this.conf.api + e)
        if (
          (n.searchParams.set("pr", this.conf.pr),
          n.searchParams.set("fr", "pc"),
          r)
        )
          for (let [u, p] of Object.entries(r)) n.searchParams.set(u, p)
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
          let u = cd(d, "__puus")
          if (
            (u &&
              ((this.cookie = ad(this.cookie, "__puus", u)),
              this.onCookieUpdate?.(this.cookie)),
            this.addition.variant === "Quark")
          ) {
            let p = cd(d, "__pus")
            p &&
              ((this.cookie = ad(this.cookie, "__pus", p)),
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
          r = 1,
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
          n._page = String(r)
          let o = await this.request("/file/sort", "GET", n),
            a = o?.data?.list || []
          if (a.length === 0) break
          for (let d of a)
            ((d.file_name = df(d.file_name)),
              this.addition.only_list_video_file
                ? (!d.file || d.category === 1) && t.push(d)
                : t.push(d))
          let c = o.metadata?.total ?? 0
          if ((c > 0 && r * s >= c) || a.length < s) break
          r++
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
        await this.request("/file/rename", "POST", void 0, {
          fid: e,
          file_name: t,
        })
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
      async uploadPreHash(e, t, r, s) {
        return (
          await this.request("/file/uploadpre", "POST", void 0, {
            ccp_hash_update: !0,
            dir_name: "",
            file_name: t,
            pdir_fid: e,
            size: r,
            pre_hash: s,
            format_type: lf(t),
          })
        ).data
      }
      async uploadCommit(e, t, r) {
        return (
          await this.request("/file/upload/commit", "POST", void 0, {
            task_id: e,
            md5: t,
            obj_key: r,
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
            console.log(
              `[Quark/UC] (${this.addition.variant || "Quark"}) init OK`,
            ))
        } catch (e) {
          console.warn("[Quark/UC] init warning:", e.message)
        }
      }
    }
  })
function ld(i) {
  let e = !i.file,
    t = i.updated_at
      ? new Date(i.updated_at).toISOString()
      : new Date().toISOString()
  return {
    name: i.file_name,
    size: i.size || 0,
    is_dir: e,
    modified: t,
    sign: "",
    type: z(i.file_name, e),
    thumb: i.thumbnail || "",
    raw_url: "",
  }
}
var Ti,
  ud = R(() => {
    "use strict"
    ee()
    dd()
    Ti = class {
      client
      pathFileIdCache = new Map()
      constructor(e) {
        this.client = new Ci(e)
      }
      async init() {
        await this.client.init()
      }
      async list(e, t) {
        let r = await this.resolveFileId(t)
        return (await this.client.getFiles(r)).map(ld)
      }
      async get(e, t) {
        let r = t.split("/").filter(Boolean),
          s = await this.resolveFileId(t),
          n = r[r.length - 1] || "root",
          o = (() => {
            try {
              return decodeURIComponent(n)
            } catch {
              return n
            }
          })(),
          a = "/" + r.slice(0, r.length - 1).join("/"),
          c = await this.resolveFileId(a),
          l = (await this.client.getFiles(c)).find(
            (h) => h.fid === s || h.file_name === n || h.file_name === o,
          ),
          u = "",
          p
        try {
          let h = await this.client.getDownloadUrl(s, o)
          ;((u = h.url), (p = h.headers))
        } catch (h) {
          console.warn(`[Quark/UC] getDownloadUrl warning for ${n}:`, h.message)
        }
        if (l) {
          let h = ld(l)
          return ((h.raw_url = u), (h.raw_url_headers = p), h)
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
          raw_url_headers: p,
        }
      }
      async mkdir(e, t) {
        let r = t.split("/").filter(Boolean),
          s = r.pop() || "\u65B0\u6587\u4EF6\u5939",
          n = "/" + r.join("/"),
          o = await this.resolveFileId(n)
        await this.client.mkdir(o, s)
      }
      async rename(e, t, r) {
        let s = await this.resolveFileId(t)
        await this.client.rename(s, r)
      }
      async remove(e, t, r) {
        let s = await this.resolveFileId(t)
        await this.client.remove([s])
      }
      async move(e, t, r, s, n) {
        let o = await this.resolveFileId(s),
          a = await this.resolveFileId(t)
        await this.client.move([o], a)
      }
      async copy(e, t, r, s, n) {
        let o = await this.resolveFileId(s),
          a = await this.resolveFileId(t)
        await this.client.copy([o], a)
      }
      async put(e, t, r) {
        throw new Error(
          "[Quark/UC] Direct put not supported in stateless environment",
        )
      }
      async resolveFileId(e) {
        let t = e.split("/").filter(Boolean).join("/")
        if (!t) return this.client.getRootFolderId()
        if (this.pathFileIdCache.has(t)) return this.pathFileIdCache.get(t)
        let r = t.split("/"),
          s = this.client.getRootFolderId()
        for (let n = 0; n < r.length; n++) {
          let o = r[n],
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
          let l = "/" + r.slice(0, n + 1).join("/")
          this.pathFileIdCache.set(l, s)
        }
        return s
      }
    }
  })
function hf(i) {
  let e = (i || "").trim()
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
  let r = (s) => {
    let n = t[s] || ""
    return /^Bearer\s+/i.test(n) ? n.replace(/^Bearer\s+/i, "").trim() : n
  }
  return r("sso-token") || r("token") || r("authorization") || ""
}
function pd(i) {
  let e = 4294967295
  for (let t = 0; t < i.length; t++)
    e = Sf[(e ^ i.charCodeAt(t)) & 255] ^ (e >>> 8)
  return (e ^ 4294967295) >>> 0
}
function Cf(i) {
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
      .map((g) => Af[parseInt(g)])
      .join(""),
    p = (pd(u) >>> 0).toString(),
    h = [s, e, i, "web", "3", p].join("|"),
    f = (pd(h) >>> 0).toString()
  return `${p}=${s}-${e}-${f}`
}
function Tf(i) {
  let e = i.indexOf("?"),
    t = e >= 0 ? i.substring(0, e) : i,
    r = e >= 0 ? i.substring(e + 1) : "",
    s = new URL(i),
    n = Cf(s.pathname)
  return `${t}?${r}${r ? "&" : ""}${n}`
}
var je,
  uf,
  pf,
  ff,
  mf,
  gf,
  yf,
  wf,
  xf,
  _f,
  vf,
  bf,
  kf,
  Pf,
  Sf,
  Af,
  Di,
  hd = R(() => {
    "use strict"
    ;((je = "https://yun.123pan.com/b/api"),
      (uf = "https://login.123pan.com/api"),
      (pf = uf + "/user/sign_in"))
    ;((ff = je + "/user/info"),
      (mf = je + "/file/list/new"),
      (gf = je + "/file/download_info"),
      (yf = je + "/file/upload_request"),
      (wf = je + "/file/mod_pid"),
      (xf = je + "/file/rename"),
      (_f = je + "/file/trash"),
      (vf = je + "/file/upload_request"),
      (bf = je + "/file/s3_upload_object/auth"),
      (kf = je + "/file/s3_repare_upload_parts_batch"),
      (Pf = je + "/file/upload_complete/v2"),
      (Sf = (() => {
        let i = new Array(256)
        for (let e = 0; e < 256; e++) {
          let t = e
          for (let r = 0; r < 8; r++)
            t = t & 1 ? 3988292384 ^ (t >>> 1) : t >>> 1
          i[e] = t
        }
        return i
      })()))
    Af = [
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
    Di = class {
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
          let e = hf(this.addition.cookie)
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
            await fetch(pf, {
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
      async request(e, t, r, s, n = !1) {
        let o = async () => {
            let d = Tf(e),
              l = {
                origin: "https://yun.123pan.com",
                referer: "https://yun.123pan.com/",
                authorization: this.accessToken
                  ? `Bearer ${this.accessToken}`
                  : "",
                "user-agent":
                  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) openlist-client",
                platform: this.addition.platform || "web",
                "app-version": "3",
                Accept: "application/json",
              },
              u = { method: t, headers: l }
            return (
              r !== void 0 &&
                t !== "GET" &&
                ((l["Content-Type"] = "application/json"),
                (u.body = JSON.stringify(r))),
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
        return (await this.request(ff, "GET", void 0, void 0, e)).data
      }
      async getFiles(e, t) {
        let r = [],
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
            c = `${mf}?${a.toString()}`,
            d = await this.request(c, "GET"),
            l = d.data?.InfoList || []
          if ((r.push(...l), t?.findName)) {
            let p = l.find(
              (h) =>
                h.FileName === t.findName &&
                (t.findIsDir === void 0 || (h.Type === 1) === t.findIsDir),
            )
            if (p) return [p]
          }
          let u = String(d.data?.Next ?? "-1")
          if (!d.data || l.length === 0 || u === "-1") break
          ;((n = u), s++)
        }
        return r
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
          s = (await this.request(gf, "POST", t)).data?.DownloadUrl || ""
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
        let r = await this.request(yf, "POST", {
          driveId: 0,
          etag: "",
          fileName: t,
          parentFileId: parseInt(e, 10) || 0,
          size: 0,
          type: 1,
        })
        return r.data?.FileId != null ? String(r.data.FileId) : ""
      }
      async rename(e, t) {
        await this.request(xf, "POST", {
          driveId: 0,
          fileId: parseInt(e, 10),
          fileName: t,
        })
      }
      async move(e, t) {
        await this.request(wf, "POST", {
          fileIdList: e.map((r) => ({ FileId: parseInt(r, 10) })),
          parentFileId: parseInt(t, 10),
        })
      }
      async remove(e, t) {
        await this.request(_f, "POST", {
          driveId: 0,
          operation: !0,
          fileTrashInfoList: [t],
        })
      }
      async getPartUploadUrl(e, t, r) {
        let n = (
          r === 1
            ? await this.getS3Auth(e, t, t + 1)
            : await this.getS3PreSignedUrls(e, t, t + 1)
        ).presignedUrls[String(t)]
        if (!n)
          throw new Error(
            `[123Pan] \u672A\u8FD4\u56DE\u7B2C ${t} \u5206\u7247\u7684\u4E0A\u4F20 URL`,
          )
        return n
      }
      async completeUpload(e, t, r) {
        await this.completeS3(e, t, r)
      }
      async createUpload(e, t, r, s) {
        let n = {
          driveId: 0,
          duplicate: 2,
          etag: s,
          fileName: e,
          parentFileId: t,
          size: r,
          type: 0,
        }
        return (await this.request(vf, "POST", n)).data
      }
      async getS3Auth(e, t, r) {
        let s = {
          StorageNode: e.StorageNode,
          bucket: e.Bucket,
          key: e.Key,
          partNumberEnd: r,
          partNumberStart: t,
          uploadId: e.UploadId,
        }
        return (await this.request(bf, "POST", s)).data
      }
      async getS3PreSignedUrls(e, t, r) {
        let s = {
          bucket: e.Bucket,
          key: e.Key,
          partNumberEnd: r,
          partNumberStart: t,
          uploadId: e.UploadId,
          StorageNode: e.StorageNode,
        }
        return (await this.request(kf, "POST", s)).data
      }
      async completeS3(e, t, r) {
        await this.request(Pf, "POST", {
          StorageNode: e.StorageNode,
          bucket: e.Bucket,
          fileId: e.FileId,
          fileSize: t,
          isMultipart: r,
          key: e.Key,
          uploadId: e.UploadId,
        })
      }
      async uploadFile(e, t, r) {
        let s = ""
        try {
          s = (await import("node:crypto"))
            .createHash("md5")
            .update(r)
            .digest("hex")
        } catch {
          s = ""
        }
        let n = await this.createUpload(t, e, r.length, s)
        if (n.Reuse || n.Key === "") return
        let o = 16 * 1024 * 1024,
          a = 1
        r.length > o && (a = Math.ceil(r.length / o))
        let c = r.length % o
        c === 0 && (c = o)
        let d
        a === 1
          ? (d = (await this.getS3Auth(n, 1, 2)).presignedUrls)
          : (d = (await this.getS3PreSignedUrls(n, 1, a + 1)).presignedUrls)
        for (let l = 1; l <= a; l++) {
          let u = (l - 1) * o,
            p = l === a ? c : o,
            h = d[String(l)]
          if (!h)
            throw new Error(
              `[123Pan] \u7F3A\u5C11\u7B2C ${l} \u5206\u7247\u7684\u4E0A\u4F20 URL`,
            )
          let f = r.subarray(u, u + p),
            g = await fetch(h, { method: "PUT", body: f })
          if (g.status !== 200) {
            let w = await g.text().catch(() => "")
            throw new Error(
              `[123Pan] \u4E0A\u4F20\u7B2C ${l}/${a} \u5206\u7247\u5931\u8D25\uFF1AHTTP ${g.status} ${w}`,
            )
          }
        }
        await this.completeS3(n, r.length, a > 1)
      }
    }
  })
function Df(i) {
  return Buffer.from(JSON.stringify(i), "utf8").toString("base64")
}
function fd(i) {
  let e = JSON.parse(Buffer.from(i, "base64").toString("utf8"))
  if (!e || !e.bucket || !e.key || !e.uploadId)
    throw new Error("[123Pan] invalid upload session")
  return e
}
function md(i) {
  return {
    AccessKeyId: "",
    SecretAccessKey: "",
    SessionToken: "",
    Bucket: i.bucket,
    Key: i.key,
    UploadId: i.uploadId,
    FileId: i.fileId,
    StorageNode: i.storageNode,
    EndPoint: "",
    Reuse: !1,
  }
}
function gd(i) {
  let e = i.Type === 1
  return {
    name: i.FileName,
    size: i.Size || 0,
    is_dir: e,
    modified: i.UpdateAt
      ? new Date(i.UpdateAt).toISOString()
      : new Date().toISOString(),
    sign: String(i.FileId),
    type: z(i.FileName, e),
    thumb: "",
    raw_url: "",
  }
}
var Ei,
  yd = R(() => {
    "use strict"
    ee()
    ie()
    hd()
    Ei = class {
      client
      addition
      pathIdCache = new Map()
      budget = { used: 0, limit: 45 }
      constructor(e, t) {
        ;((this.addition = e), (this.client = new Di(e, t)))
      }
      async init() {
        await this.client.login()
      }
      async resolveFolderId(e) {
        let t = this.client.getRootId(),
          r =
            "/" +
            String(e || "")
              .split("/")
              .filter(Boolean)
              .join("/")
        if (r === "/" || r === `/${t}`) return t
        let s = r.split("/").filter(Boolean),
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
            p = (
              await this.client.getFiles(o, {
                findName: l,
                findIsDir: !0,
                budget: this.budget,
              })
            ).find(
              (h) =>
                h.Type === 1 &&
                (h.FileName === d ||
                  h.FileName === l ||
                  String(h.FileId) === d ||
                  String(h.FileId) === l),
            )
          if (!p) throw new Error(`folder not found: ${d}`)
          ;((o = String(p.FileId)),
            (a = "/" + s.slice(0, c + 1).join("/")),
            this.pathIdCache.set(a, o))
        }
        return o
      }
      async ensureFolderId(e) {
        let t = this.client.getRootId(),
          r =
            "/" +
            String(e || "")
              .split("/")
              .filter(Boolean)
              .join("/")
        if (r === "/" || r === `/${t}`) return t
        let s = r.split("/").filter(Boolean),
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
              p = u.find(
                (h) => h.Type === 1 && (h.FileName === c || h.FileName === d),
              )
            if (p) l = String(p.FileId)
            else {
              try {
                let h = await this.client.mkdir(n, d)
                h && (l = h)
              } catch {}
              if (l === void 0) {
                if (
                  ((u = await this.client.getFiles(n, {
                    findName: d,
                    findIsDir: !0,
                    budget: this.budget,
                  })),
                  (p = u.find((h) => h.Type === 1 && h.FileName === d)),
                  !p)
                )
                  throw new Error(
                    `[123Pan] \u81EA\u52A8\u521B\u5EFA\u76EE\u5F55\u5931\u8D25: ${c}`,
                  )
                l = String(p.FileId)
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
        let r = t[t.length - 1],
          s = (() => {
            try {
              return decodeURIComponent(r)
            } catch {
              return r
            }
          })(),
          n = "/" + t.slice(0, t.length - 1).join("/"),
          o = await this.resolveFolderId(n),
          c = (
            await this.client.getFiles(o, { findName: s, budget: this.budget })
          ).find(
            (d) =>
              String(d.FileId) === r ||
              String(d.FileId) === s ||
              d.FileName === r ||
              d.FileName === s,
          )
        if (!c) throw new Error(`file not found: ${r}`)
        return { file: c, parentId: o, name: r }
      }
      async list(e, t) {
        this.budget.used = 0
        let r = await this.resolveFolderId(t),
          n = (await this.client.getFiles(r, { budget: this.budget })).map(gd)
        return N(
          n,
          this.addition.order_by || "file_name",
          this.addition.order_direction,
        )
      }
      async get(e, t) {
        this.budget.used = 0
        let r = String(t || "")
          .split("/")
          .filter(Boolean)
        if (r.length === 0 || r[r.length - 1] === this.client.getRootId()) {
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
          n = gd(s)
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
        let r = String(t || "")
            .split("/")
            .filter(Boolean),
          s = r.pop() || "\u65B0\u6587\u4EF6\u5939",
          n = "/" + r.join("/"),
          o = await this.resolveFolderId(n)
        await this.client.mkdir(o, s)
      }
      async rename(e, t, r) {
        this.budget.used = 0
        let { file: s } = await this.resolveFile(t)
        await this.client.rename(String(s.FileId), r)
      }
      async remove(e, t, r) {
        this.budget.used = 0
        let { file: s } = await this.resolveFile(t)
        await this.client.remove(String(s.FileId), s)
      }
      async move(e, t, r, s, n) {
        this.budget.used = 0
        let { file: o } = await this.resolveFile(s),
          a = String(t).split("/").filter(Boolean),
          c = await this.resolveFolderId("/" + a.join("/"))
        await this.client.move([String(o.FileId)], c)
      }
      async copy() {
        throw new Error("[123Pan] Copy is not supported by 123 Cloud Drive API")
      }
      async put(e, t, r) {
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
        await this.client.uploadFile(c, o, r)
      }
      async createUploadSession(e, t, r, s, n) {
        this.budget.used = 0
        let o = await this.ensureFolderId(t || "/"),
          a = await this.client.createUpload(r, o, s, n || ""),
          c = 16 * 1024 * 1024
        if (a.Reuse || a.Key === "")
          return { reuse: !0, partCount: 0, chunkSize: c, session: "" }
        let d = Math.max(1, Math.ceil(s / c)),
          l = Df({
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
      async uploadPart(e, t, r) {
        this.budget.used = 0
        let s = fd(e),
          n = await this.client.getPartUploadUrl(md(s), t, s.partCount),
          o = await fetch(n, { method: "PUT", body: r })
        if (o.status !== 200) {
          let a = await o.text().catch(() => "")
          throw new Error(
            `[123Pan] \u4E0A\u4F20\u7B2C ${t}/${s.partCount} \u5206\u7247\u5931\u8D25\uFF1AHTTP ${o.status} ${a}`,
          )
        }
      }
      async completeUploadSession(e) {
        this.budget.used = 0
        let t = fd(e)
        await this.client.completeUpload(md(t), t.size, t.partCount > 1)
      }
    }
  })
function Yn(i) {
  return Array.from(new Uint8Array(i))
    .map((e) => e.toString(16).padStart(2, "0"))
    .join("")
}
function Er(i) {
  return typeof i == "string" ? new TextEncoder().encode(i) : i
}
function Ef(i) {
  let e = typeof i == "string" ? new TextEncoder().encode(i) : i,
    t = e.length,
    r = t * 8,
    s = (56 - ((t + 1) % 64) + 64) % 64,
    n = new Uint8Array(t + 1 + s + 8)
  ;(n.set(e), (n[t] = 128))
  let o = new DataView(n.buffer)
  ;(o.setUint32(n.length - 8, r >>> 0, !0),
    o.setUint32(n.length - 4, Math.floor(r / 4294967296), !0))
  let a = new Int32Array(64)
  for (let f = 0; f < 64; f++)
    a[f] = (Math.abs(Math.sin(f + 1)) * 4294967296) | 0
  let c = [
      7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20,
      5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4,
      11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6,
      10, 15, 21,
    ],
    d = 1732584193,
    l = 4023233417,
    u = 2562383102,
    p = 271733878
  for (let f = 0; f < n.length; f += 64) {
    let g = new DataView(n.buffer, f, 64),
      w = Array.from({ length: 16 }, (_, b) => g.getInt32(b * 4, !0)),
      [m, y, v, x] = [d, l, u, p]
    for (let _ = 0; _ < 64; _++) {
      let b, P
      _ < 16
        ? ((b = (y & v) | (~y & x)), (P = _))
        : _ < 32
          ? ((b = (x & y) | (~x & v)), (P = (5 * _ + 1) % 16))
          : _ < 48
            ? ((b = y ^ v ^ x), (P = (3 * _ + 5) % 16))
            : ((b = v ^ (y | ~x)), (P = (7 * _) % 16))
      let A = x
      ;((x = v), (v = y))
      let C = (m + b + a[_] + w[P]) | 0
      ;((y = (y + ((C << c[_]) | (C >>> (32 - c[_])))) | 0), (m = A))
    }
    ;((d = (d + m) | 0),
      (l = (l + y) | 0),
      (u = (u + v) | 0),
      (p = (p + x) | 0))
  }
  let h = new DataView(new ArrayBuffer(16))
  return (
    h.setInt32(0, d, !0),
    h.setInt32(4, l, !0),
    h.setInt32(8, u, !0),
    h.setInt32(12, p, !0),
    Yn(h.buffer)
  )
}
function Ve(i) {
  return Ef(i)
}
async function gt(i) {
  let e = await crypto.subtle.digest("SHA-1", Er(i))
  return Yn(e)
}
async function Zn(i, e) {
  let t = await crypto.subtle.importKey(
      "raw",
      Er(e),
      { name: "HMAC", hash: "SHA-256" },
      !1,
      ["sign"],
    ),
    r = await crypto.subtle.sign("HMAC", t, Er(i))
  return Yn(r)
}
async function wd(i, e) {
  let t = await crypto.subtle.importKey(
      "raw",
      Er(e),
      { name: "HMAC", hash: "SHA-1" },
      !1,
      ["sign"],
    ),
    r = await crypto.subtle.sign("HMAC", t, Er(i)),
    s = new Uint8Array(r),
    n = ""
  for (let o of s) n += String.fromCharCode(o)
  return btoa(n)
}
var yt = R(() => {
  "use strict"
})
function Uf(i) {
  return new Promise((e) => setTimeout(e, i))
}
function io(i) {
  if (!i) return i
  try {
    let e = new URL(i)
    return (e.searchParams.delete("access_token"), e.toString())
  } catch {
    return i
  }
}
function Xt(i) {
  let e = { ...(i || {}) },
    t = (r, s) =>
      r == null || r === ""
        ? s
        : typeof r == "boolean"
          ? r
          : String(r).toLowerCase() === "true"
  return (
    (e.use_online_api = t(e.use_online_api, !0)),
    (e.api_url_address =
      e.api_url_address || "https://api.oplist.org/baiduyun/renewapi"),
    (e.download_api = e.download_api || "official"),
    (e.custom_crack_ua = e.custom_crack_ua || "netdisk"),
    (e.order_by = e.order_by || "name"),
    (e.order_direction = e.order_direction || "asc"),
    (e.upload_thread = e.upload_thread || "3"),
    (e.upload_api = e.upload_api || Jt),
    (e.use_dynamic_upload_api = t(e.use_dynamic_upload_api, !0)),
    (e.custom_upload_part_size = e.custom_upload_part_size || 0),
    (e.low_bandwith_upload_mode = t(e.low_bandwith_upload_mode, !1)),
    (e.only_list_video_file = t(e.only_list_video_file, !1)),
    e
  )
}
function _d(i, e, t) {
  ;((i.local_mtime = String(t)), (i.local_ctime = String(e)))
}
var Ff,
  xd,
  Vt,
  eo,
  to,
  ro,
  If,
  Jt,
  Rf,
  Fr,
  so,
  vd,
  Bf,
  Fi,
  Qt,
  no = R(() => {
    "use strict"
    ;((Ff = "https://openapi.baidu.com/oauth/2.0/token"),
      (xd = "https://pan.baidu.com/rest/2.0"),
      (Vt = 4 * 1024 * 1024),
      (eo = 16 * 1024 * 1024),
      (to = 32 * 1024 * 1024),
      (ro = 2048),
      (If = 1 * 1024 * 1024),
      (Jt = "https://d.pcs.baidu.com"),
      (Rf = 60 * 1e3),
      (Fr = 3),
      (so = 1e3),
      (vd = 5e3),
      (Bf = new Set([111, -6, 20016])))
    ;((Fi = class i {
      addition
      accessToken = ""
      onTokenUpdate
      constructor(e, t) {
        ;((this.addition = Xt(e)),
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
              headers: { "User-Agent": i.apiUA },
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
        let t = new URL(Ff)
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
      async request(e, t, r, s) {
        await this.ensureToken()
        let n = async () => {
            let a = new URL(e)
            a.searchParams.set("access_token", this.accessToken)
            for (let [f, g] of Object.entries(r || {})) a.searchParams.set(f, g)
            let c = { "User-Agent": i.apiUA, Accept: "application/json" },
              d = { method: t, headers: c }
            if (s && t === "POST") {
              let f = new URLSearchParams()
              for (let [g, w] of Object.entries(s)) f.set(g, w)
              ;((c["Content-Type"] = "application/x-www-form-urlencoded"),
                (d.body = f.toString()))
            }
            let l = await fetch(a.toString(), d),
              u = await l.text(),
              p
            try {
              p = JSON.parse(u)
            } catch {
              throw new Error(
                `req: [${e}] invalid JSON response, status ${l.status}`,
              )
            }
            let h = typeof p.errno == "number" ? p.errno : 0
            if (h !== 0) {
              if (
                (Bf.has(h) && (await this.refreshToken()),
                h === 31023 && this.addition.download_api === "crack_video")
              )
                return p
              let f = `req: [${e}] ,errno: ${h}, refer to https://pan.baidu.com/union/doc/`
              throw h === 31023
                ? new Error(
                    `${f} \u767E\u5EA6\u7F51\u76D8\u98CE\u63A7 (Trigger security policy: Please try again later) \u2014 \u89E6\u53D1\u539F\u56E0\u901A\u5E38\u662F\uFF1A\u2460 \u5F53\u524D\u90E8\u7F72\u73AF\u5883\u7684\u51FA\u53E3 IP\uFF08\u5982 Cloudflare Workers \u6570\u636E\u4E2D\u5FC3 IP\uFF09\u88AB\u767E\u5EA6\u5B89\u5168\u7B56\u7565\u62E6\u622A\uFF1B\u2461 refresh_token \u65E0\u6548\u6216\u4ECE\u975E\u5B98\u65B9\u6E20\u9053\u83B7\u53D6\uFF0C\u5BFC\u81F4\u8D26\u53F7\u88AB\u98CE\u63A7\u3002\u8BF7\u786E\u8BA4\uFF1Arefresh_token \u5FC5\u987B\u901A\u8FC7 https://api.oplist.org/ \u83B7\u53D6\uFF08\u672C\u9A71\u52A8\u9ED8\u8BA4\u5DF2\u5F00\u542F"\u4F7F\u7528\u5728\u7EBF API"\uFF09\uFF1B\u98CE\u63A7\u4E3A\u4E34\u65F6\u6027\uFF0C\u7B49\u5F85\u6570\u5206\u949F\u81F3\u6570\u5C0F\u65F6\u540E\u81EA\u52A8\u89E3\u9664\uFF1B\u957F\u671F\u4F7F\u7528\u8BF7\u5C06\u540E\u7AEF\u90E8\u7F72\u5230\u5883\u5185\u670D\u52A1\u5668\uFF08\u6216\u914D\u7F6E HTTPS_PROXY \u5883\u5185\u4EE3\u7406\uFF09\u3002`,
                  )
                : new Error(f)
            }
            return p
          },
          o
        for (let a = 0; a < Fr; a++)
          try {
            return await n()
          } catch (c) {
            ;((o = c), a < Fr - 1 && (await Uf(so * Math.pow(2, a))))
          }
        throw o
      }
      get(e, t) {
        return this.request(xd + e, "GET", t)
      }
      postForm(e, t, r) {
        return this.request(xd + e, "POST", t, r)
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
        let r = (
          await this.get("/xpan/multimedia", {
            method: "filemetas",
            fsids: `[${e}]`,
            dlink: "1",
          })
        ).list?.[0]?.dlink
        if (!r) throw new Error("no dlink returned from filemetas")
        let s = `${r}&access_token=${this.accessToken}`,
          o =
            (
              await fetch(s, {
                method: "HEAD",
                redirect: "manual",
                headers: { "User-Agent": "pan.baidu.com" },
              })
            ).headers.get("location") || s
        return { url: io(o), headers: { "User-Agent": "pan.baidu.com" } }
      }
      async getCrackLink(e) {
        let r = (
          await this.request("https://pan.baidu.com/api/filemetas", "GET", {
            target: `["${e}"]`,
            dlink: "1",
            web: "5",
            origin: "dlna",
          })
        ).info?.[0]?.dlink
        if (!r) throw new Error("no dlink returned from crack filemetas")
        return {
          url: io(r),
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
          url: io(s),
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
      async create(e, t, r, s, n, o, a) {
        let c = { path: e, size: String(t), isdir: String(r), rtype: "3" }
        return (
          o !== 0 && a !== 0 && _d(c, a, o),
          s && (c.uploadid = s),
          n && (c.block_list = n),
          this.postForm("/xpan/file", { method: "create" }, c)
        )
      }
      async precreate(e, t, r, s, n, o, a) {
        let c = {
          path: e,
          size: String(t),
          isdir: "0",
          autoinit: "1",
          rtype: "3",
          block_list: r,
        }
        ;(s !== "" &&
          n !== "" &&
          ((c["content-md5"] = s), (c["slice-md5"] = n)),
          _d(c, o, a))
        let d = await this.postForm("/xpan/file", { method: "precreate" }, c)
        return (
          d.return_type === 2 &&
            d.info &&
            ((d.info.ctime = o), (d.info.mtime = a)),
          d
        )
      }
      async uploadSlice(e, t, r, s, n) {
        let o = new URL(e + "/rest/2.0/pcs/superfile2")
        for (let [l, u] of Object.entries(t)) o.searchParams.set(l, u)
        let a = new FormData()
        a.append("file", new Blob([s]), r)
        let c = new AbortController(),
          d = setTimeout(() => c.abort(), n > 0 ? n : Rf)
        try {
          let u = await (
              await fetch(o.toString(), {
                method: "POST",
                body: a,
                signal: c.signal,
              })
            ).text(),
            p = u.toLowerCase()
          if (
            p.includes("uploadid") &&
            (p.includes("invalid") ||
              p.includes("expired") ||
              p.includes("not found"))
          )
            throw new Qt()
          let h
          try {
            h = JSON.parse(u)
          } catch {
            h = {}
          }
          let f = h?.error_code ?? 0,
            g = h?.errno ?? 0
          if (f !== 0 || g !== 0)
            throw new Error(`error uploading to baidu, response=${u}`)
        } finally {
          clearTimeout(d)
        }
      }
      getUploadUrl(e, t) {
        let r = this.addition
        return (!r.use_dynamic_upload_api || !t, r.upload_api || Jt)
      }
      async requestForUploadUrl(e, t) {
        let r = await this.request(
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
          (r.servers && r.servers.length > 0
            ? (s = r.servers[0].server)
            : r.bak_servers &&
              r.bak_servers.length > 0 &&
              (s = r.bak_servers[0].server),
          !s)
        )
          throw new Error("upload URL is empty")
        return s
      }
      getSliceSize(e, t) {
        let r = this.addition,
          s = r.custom_upload_part_size || 0
        if (t === 0)
          return (
            s !== 0 &&
              console.warn(
                "[baidu_netdisk] CustomUploadPartSize is not supported for non-vip user, use DefaultSliceSize",
              ),
            e > ro * Vt &&
              console.warn(
                `[baidu_netdisk] File size(${e}) is too large, may cause upload failure`,
              ),
            Vt
          )
        if (s !== 0)
          return s < Vt
            ? (console.warn(
                `[baidu_netdisk] CustomUploadPartSize(${s}) is less than DefaultSliceSize, use DefaultSliceSize`,
              ),
              Vt)
            : t === 1 && s > eo
              ? (console.warn(
                  `[baidu_netdisk] CustomUploadPartSize(${s}) is greater than VipSliceSize, use VipSliceSize`,
                ),
                eo)
              : t === 2 && s > to
                ? (console.warn(
                    `[baidu_netdisk] CustomUploadPartSize(${s}) is greater than SVipSliceSize, use SVipSliceSize`,
                  ),
                  to)
                : s
        let n = Vt
        if (
          (t === 1 && (n = eo), t === 2 && (n = to), r.low_bandwith_upload_mode)
        ) {
          let o = Vt
          for (; o <= n; ) {
            if (e <= ro * o) return o
            o += If
          }
        }
        return (
          e > ro * n &&
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
    }),
      (Qt = class extends Error {
        constructor() {
          ;(super("uploadid expired"), (this.name = "ErrUploadIDExpired"))
        }
      }))
  })
function qf(i) {
  return new Promise((e) => setTimeout(e, i))
}
function bd(i) {
  let e = i.server_filename || Ir(i.path),
    t = i.server_ctime || i.ctime || 0,
    r = i.server_mtime || i.mtime || 0,
    s = i.isdir === 1
  return {
    name: e,
    size: i.size || 0,
    is_dir: s,
    created: t ? new Date(t * 1e3).toISOString() : void 0,
    modified: r ? new Date(r * 1e3).toISOString() : new Date().toISOString(),
    sign: String(i.fs_id),
    type: z(e, s),
    thumb: i.thumbs?.url3 || "",
    raw_url: "",
  }
}
function Ir(i) {
  let e = String(i || "").split("/")
  return e[e.length - 1] || ""
}
function kd(i) {
  let e = i.lastIndexOf("/")
  return e <= 0 ? "/" : i.slice(0, e)
}
var $f,
  Ii,
  Pd = R(() => {
    "use strict"
    ee()
    ie()
    yt()
    no()
    no()
    $f = new Error("empty files are not allowed by baidu netdisk")
    Ii = class {
      client
      addition
      uploadThread = 3
      vipType = 0
      pathCache = new Map()
      constructor(e, t) {
        ;((this.addition = Xt(e)), (this.client = new Fi(this.addition, t)))
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
        let r = await this.client.getFiles(this.baiduPath(t)),
          s = r.map(bd)
        for (let n of r)
          this.pathCache.set(n.path, { fsId: n.fs_id, parent: kd(n.path) })
        return N(
          s,
          this.addition.order_by || "name",
          this.addition.order_direction,
        )
      }
      async get(e, t) {
        let r = this.baiduPath(t)
        if (r === "/")
          return {
            name: "/",
            size: 0,
            is_dir: !0,
            modified: new Date().toISOString(),
            sign: "",
            type: 1,
            raw_url: "",
          }
        let s = kd(r),
          n = Ir(r),
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
              l.path === r ||
              String(l.fs_id) === n,
          )
        if (!c) throw new Error(`file not found: ${n}`)
        this.pathCache.set(c.path, { fsId: c.fs_id, parent: s })
        let d = bd(c)
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
      async rename(e, t, r) {
        await this.client.manage("rename", [
          { path: this.baiduPath(t), newname: r },
        ])
      }
      async remove(e, t, r) {
        await this.client.manage("delete", [this.baiduPath(t)])
      }
      async move(e, t, r, s, n) {
        let o = r[0] || Ir(s),
          a = this.baiduPath(t)
        await this.client.manage("move", [
          { path: this.baiduPath(s), dest: a, newname: o },
        ])
      }
      async copy(e, t, r, s, n) {
        let o = r[0] || Ir(s),
          a = this.baiduPath(t)
        await this.client.manage("copy", [
          { path: this.baiduPath(s), dest: a, newname: o },
        ])
      }
      async put(e, t, r) {
        if (r.length < 1) throw $f
        let s = r.length,
          n = this.baiduPath(t),
          o = Ir(n),
          a = Math.floor(Date.now() / 1e3),
          c = a,
          d = a,
          l = Ve(r),
          u = JSON.stringify([l])
        try {
          await this.client.create(n, s, 0, "", u, c, d)
          return
        } catch {}
        let p = this.client.getSliceSize(s, this.vipType),
          h = Math.max(1, Math.ceil(s / p)),
          f = s % p || p,
          g = []
        for (let y = 0; y < h; y++) {
          let v = y === h - 1 ? f : p,
            x = r.subarray(y * p, y * p + v)
          g.push(Ve(x))
        }
        let w = JSON.stringify(g),
          m = await this.client.precreate(
            n,
            s,
            w,
            l,
            Ve(r.subarray(0, 256 * 1024)),
            d,
            c,
          )
        if (!(m.return_type === 2 && m.info)) {
          for (let y = 0; y < 2; y++) {
            let v = this.addition.upload_api || Jt
            if (this.addition.use_dynamic_upload_api && m.uploadid)
              try {
                v = await this.client.requestForUploadUrl(n, m.uploadid)
              } catch {
                v = this.addition.upload_api || Jt
              }
            let x = m.block_list || [],
              _ = !1,
              b = 0,
              P = Math.max(1, Math.min(this.uploadThread, x.length)),
              A = async () => {
                for (;;) {
                  let C = b++
                  if (C >= x.length) return
                  let S = x[C]
                  if (S < 0) continue
                  let k = S * p,
                    D = S + 1 === h ? f : p,
                    F = r.subarray(k, k + D),
                    T = {
                      method: "upload",
                      access_token: this.client.accessToken,
                      type: "tmpfile",
                      path: n,
                      uploadid: m.uploadid,
                      partseq: String(S),
                    },
                    O = !1
                  for (let q = 0; q < Fr; q++)
                    try {
                      ;(await this.client.uploadSlice(
                        v,
                        T,
                        o,
                        F,
                        (this.addition.upload_timeout || 60) * 1e3,
                      ),
                        (x[C] = -1),
                        (O = !0))
                      break
                    } catch (L) {
                      if (L instanceof Qt) throw L
                      q < Fr - 1 &&
                        (await qf(Math.min(so * Math.pow(2, q), vd)))
                    }
                  if (!O)
                    throw ((_ = !0), new Error(`upload slice ${S} failed`))
                }
              }
            try {
              if ((await Promise.all(Array.from({ length: P }, () => A())), _))
                throw new Error("upload slice failed")
            } catch (C) {
              if (C instanceof Qt) {
                let S = await this.client.precreate(n, s, w, "", "", d, c)
                if (S.return_type === 2 && S.info) return
                m = S
                continue
              }
              throw C
            }
            await this.client.create(n, s, 0, m.uploadid, w, c, d)
            return
          }
          throw new Error("upload failed after retries")
        }
      }
    }
  })
function Qf(i) {
  return i === 99 || String(i).startsWith("401")
}
var ze,
  Of,
  jf,
  zf,
  Lf,
  Nf,
  Sd,
  Mf,
  Hf,
  Wf,
  Kf,
  Gf,
  Vf,
  Jf,
  Rr,
  Ri,
  Ad = R(() => {
    "use strict"
    ;((ze = "https://proapi.115.com"),
      (Of = "https://passportapi.115.com"),
      (jf = ze + "/open/upload/get_token"),
      (zf = ze + "/open/upload/init"),
      (Lf = ze + "/open/folder/add"),
      (Nf = ze + "/open/ufile/files"),
      (Sd = ze + "/open/folder/get_info"),
      (Mf = ze + "/open/ufile/copy"),
      (Hf = ze + "/open/ufile/move"),
      (Wf = ze + "/open/ufile/downurl"),
      (Kf = ze + "/open/ufile/update"),
      (Gf = ze + "/open/ufile/delete"),
      (Vf = ze + "/open/user/info"),
      (Jf = Of + "/open/refreshToken"))
    ;((Rr = 430004),
      (Ri = class i {
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
          let r = e.limit_rate || 0
          r > 0 && (this.rateLimitMs = 1e3 / r)
        }
        async waitRateLimit() {
          if (this.rateLimitMs <= 0) return
          let e = Date.now(),
            t = this.lastRequestAt + this.rateLimitMs - e
          ;(t > 0 && (await new Promise((r) => setTimeout(r, t))),
            (this.lastRequestAt = Date.now()))
        }
        async fetchWithRetry(e, t) {
          let r
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
              ;((r = n),
                s < 2 &&
                  (await new Promise((o) => setTimeout(o, 500 * (s + 1)))))
            }
          throw r
        }
        static describeNetError(e) {
          let t = e,
            r = t?.cause?.code || t?.cause?.cause?.code,
            s = t?.cause?.message || t?.cause?.cause?.message
          return r
            ? `${t?.message || "fetch failed"}\uFF08${r}\uFF09`
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
          let r = await (
            await this.fetchWithRetry(Jf, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: e.toString(),
            })
          ).json()
          if (r.code !== 0 || !r.data?.access_token || !r.data?.refresh_token)
            throw new Error(
              `115 \u7F51\u76D8 token \u5237\u65B0\u5931\u8D25\uFF08code ${r.code} ${r.message}\uFF09\uFF1A\u8BF7\u786E\u8BA4 refresh_token \u6709\u6548\u3002`,
            )
          ;((this.accessToken = r.data.access_token),
            (this.refreshTokenValue = r.data.refresh_token),
            (this.addition.access_token = this.accessToken),
            (this.addition.refresh_token = this.refreshTokenValue),
            this.onTokenUpdate?.({
              access_token: this.accessToken,
              refresh_token: this.refreshTokenValue,
            }))
        }
        async request(e, t, r, s, n, o = !1) {
          await this.waitRateLimit()
          let a = async () => {
              let l = new URL(e)
              for (let [w, m] of Object.entries(r || {}))
                m !== "" && l.searchParams.set(w, m)
              let u = {
                Accept: "application/json",
                "User-Agent":
                  n ||
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/142.0.0.0 OpenList/425.6.30",
              }
              this.accessToken &&
                (u.Authorization = `Bearer ${this.accessToken}`)
              let p = { method: t, headers: u }
              if (s && t === "POST") {
                let w = new URLSearchParams()
                for (let [m, y] of Object.entries(s)) y !== "" && w.set(m, y)
                ;((u["Content-Type"] = "application/x-www-form-urlencoded"),
                  (p.body = w.toString()))
              }
              let h = await this.fetchWithRetry(l.toString(), p),
                f = await h.text(),
                g
              try {
                g = JSON.parse(f)
              } catch {
                g = { state: !1, code: h.status, message: f.slice(0, 200) }
              }
              return { body: g, rawText: f }
            },
            c
          try {
            ;({ body: c } = await a())
          } catch (l) {
            throw new Error(i.describeNetError(l))
          }
          let d = c?.state
          if (d === !1 || d === void 0) {
            let l = Number(c?.code ?? 0)
            if (Qf(l) && !o) {
              ;(await this.refreshToken(), (c = (await a()).body))
              let p = c?.state
              if (p !== !1 && p !== void 0) return c
              throw new Error(
                `115 \u7F51\u76D8 API \u9519\u8BEF\uFF08code ${c?.code} ${c?.message}\uFF09`,
              )
            }
            if (l === Rr) {
              let u = new Error("115 object not found")
              throw ((u.code = Rr), u)
            }
            throw new Error(
              `115 \u7F51\u76D8 API \u9519\u8BEF\uFF08code ${l} ${c?.message || ""}\uFF09`,
            )
          }
          return c
        }
        async userInfo() {
          return (await this.request(Vf, "GET"))?.data
        }
        async getFiles(e) {
          let t = await this.request(Nf, "GET", {
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
          return (await this.request(Sd, "GET", { file_id: e }))?.data
        }
        async getFolderInfoByPath(e) {
          return (await this.request(Sd, "POST", void 0, { path: e }))?.data
        }
        async mkdir(e, t) {
          return (
            await this.request(Lf, "POST", void 0, { pid: e, file_name: t })
          )?.data
        }
        async move(e, t) {
          await this.request(Hf, "POST", void 0, { file_ids: e, to_cid: t })
        }
        async updateFile(e, t) {
          await this.request(Kf, "POST", void 0, { file_id: e, file_name: t })
        }
        async copy(e, t) {
          await this.request(Mf, "POST", void 0, {
            pid: e,
            file_id: t,
            no_dupli: "1",
          })
        }
        async delFile(e, t) {
          await this.request(Gf, "POST", void 0, { file_ids: e, parent_id: t })
        }
        async downUrl(e, t) {
          return (await this.request(Wf, "POST", void 0, { pick_code: e }, t))
            ?.data
        }
        async uploadGetToken() {
          return (await this.request(jf, "GET"))?.data
        }
        async uploadInit(e) {
          return (
            await this.request(zf, "POST", void 0, {
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
      }))
  })
function Cd(i) {
  let e = i.fc === "0"
  return {
    name: i.fn,
    size: i.fs || 0,
    is_dir: e,
    created: i.uppt ? new Date(i.uppt * 1e3).toISOString() : void 0,
    modified: i.upt
      ? new Date(i.upt * 1e3).toISOString()
      : new Date().toISOString(),
    sign: i.fid,
    type: z(i.fn, e),
    thumb: i.thumbnail || i.fco || "",
    raw_url: "",
  }
}
function Yf(i) {
  let e = { ...(i || {}) }
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
var Bi,
  Xf,
  Ui,
  Td = R(() => {
    "use strict"
    ee()
    ie()
    yt()
    Ad()
    ;((Bi =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/142.0.0.0 OpenList/425.6.30"),
      (Xf = 45))
    Ui = class i {
      client
      addition
      pageSize = 200
      parentPath = "/"
      fidCache = new Map()
      budget = { used: 0, limit: Xf }
      linkCache = new Map()
      static LINK_TTL_MS = 1800 * 1e3
      constructor(e, t) {
        ;((this.addition = Yf(e)), (this.client = new Ri(this.addition, t)))
      }
      async init() {
        let t = this.addition.page_size || 200
        ;(t <= 0 && (t = 200), t > 1150 && (t = 1150), (this.pageSize = t))
        try {
          await this.client.userInfo()
        } catch (s) {
          if (s?.code === Rr) throw s
          let n = String(s?.message || s)
          throw n.includes("fetch") ||
            n.includes("ECONN") ||
            n.includes("abort")
            ? new Error(
                `115 \u7F51\u76D8\u7F51\u7EDC\u8FDE\u63A5\u5931\u8D25\uFF08${n}\uFF09\uFF1Aproapi.115.com \u53EF\u80FD\u65E0\u6CD5\u4ECE\u5F53\u524D\u90E8\u7F72\u73AF\u5883\u8BBF\u95EE\uFF08\u6570\u636E\u4E2D\u5FC3 IP \u53EF\u80FD\u88AB 115 \u62E6\u622A\uFF09\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u6216\u66F4\u6362\u90E8\u7F72\u73AF\u5883\u3002`,
              )
            : new Error(
                `115 \u7F51\u76D8 token \u9A8C\u8BC1\u5931\u8D25\uFF1A${n}\u3002\u8BF7\u786E\u8BA4 access_token / refresh_token \u6709\u6548\u3002`,
              )
        }
        let r = this.getRootId()
        if (r !== "0")
          try {
            let s = await this.client.getFolderInfo(r)
            if (s.file_id !== "0") {
              this.parentPath = `/${s.file_name}`
              let n = [...(s.paths || [])].reverse()
              for (let o of n)
                this.parentPath = `/${o.file_name}${this.parentPath}`
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
        let r = await this.resolveFolderId(t),
          s = [],
          n = 0
        for (; this.reserve(); ) {
          let { files: o, count: a } = await this.client.getFiles({
            cid: r,
            limit: this.pageSize,
            offset: n,
            asc: this.addition.order_direction === "asc",
            o: this.addition.order_by || "file_name",
            showDir: !0,
          })
          for (let c of o) (s.push(Cd(c)), this.fidCache.set(c.fid, c.fid))
          if (s.length >= a || o.length === 0) break
          n += o.length
        }
        return N(
          s,
          this.addition.order_by || "file_name",
          this.addition.order_direction,
        )
      }
      async resolveFolderId(e) {
        let t = this.getRootId(),
          r =
            "/" +
            String(e || "")
              .split("/")
              .filter(Boolean)
              .join("/")
        if (r === "/" || r === `/${t}`) return t
        let s = this.fidCache.get(r)
        if (s) return s
        let n = `/${t === "0" ? "" : t}${r === "/" ? "" : r}`
        try {
          if (!this.reserve()) throw new Error("subrequest budget exceeded")
          let d = await this.client.getFolderInfoByPath(n)
          if (d.file_id) return (this.fidCache.set(r, d.file_id), d.file_id)
        } catch (d) {
          if (d?.code !== Rr && d?.code !== 990002) throw d
        }
        let o = r.split("/").filter(Boolean),
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
          let { files: p } = await this.client.getFiles({
              cid: a,
              limit: 1e3,
              offset: 0,
              asc: !0,
              o: "file_name",
              showDir: !0,
            }),
            h = p.find(
              (f) => f.fc === "0" && (f.fn === d || f.fn === l || f.fid === d),
            )
          if (!h) throw new Error(`folder not found: ${d}`)
          ;((a = h.fid), this.fidCache.set(c, a))
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
          r = t.split("/").filter(Boolean),
          s = r.pop() || ""
        if (!s) throw new Error(`file not found: ${t}`)
        let n = (() => {
            try {
              return decodeURIComponent(s)
            } catch {
              return s
            }
          })(),
          o = "/" + r.join("/"),
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
              (p) => p.fn === s || p.fn === n || p.fid === s || p.fid === n,
            )
          if (u) return u
          if (d.length === 0 || c + d.length >= l) break
          c += d.length
        }
        throw new Error(`file not found: ${s}`)
      }
      async get(e, t) {
        this.budget.used = 0
        let r =
          "/" +
          String(t || "")
            .split("/")
            .filter(Boolean)
            .join("/")
        if (r === "/" || r === `/${this.getRootId()}`)
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
          n = Cd(s)
        if (s.fc !== "0" && s.pc)
          try {
            let o = `${s.fid}|${Bi}`,
              a = this.linkCache.get(o)
            if (a && a.expire > Date.now())
              ((n.raw_url = a.url), (n.raw_url_headers = { "User-Agent": Bi }))
            else {
              if (!this.reserve()) throw new Error("subrequest budget exceeded")
              let d = (await this.client.downUrl(s.pc, Bi))[s.fid]
              d?.url?.url &&
                ((n.raw_url = d.url.url),
                (n.raw_url_headers = { "User-Agent": Bi }),
                this.linkCache.set(o, {
                  url: d.url.url,
                  expire: Date.now() + i.LINK_TTL_MS,
                }))
            }
          } catch (o) {
            String(o?.message || o).includes("406")
              ? console.warn(
                  "[115open] downurl \u914D\u989D\u7528\u5C3D\uFF08406\uFF09\uFF1A\u5DF2\u4F7F\u7528\u7F13\u5B58\u6216\u7A0D\u540E\u91CD\u8BD5",
                )
              : console.warn(
                  `[115open] downUrl warning for ${s.fn}:`,
                  o.message,
                )
          }
        return n
      }
      async mkdir(e, t) {
        this.budget.used = 0
        let r = String(t || "")
            .split("/")
            .filter(Boolean),
          s = r.pop() || "\u65B0\u6587\u4EF6\u5939",
          n = "/" + r.join("/"),
          o = await this.resolveFolderId(n)
        if (!this.reserve()) throw new Error("subrequest budget exceeded")
        await this.client.mkdir(o, s)
      }
      async rename(e, t, r) {
        this.budget.used = 0
        let s = await this.resolveFile(t)
        if (!this.reserve()) throw new Error("subrequest budget exceeded")
        await this.client.updateFile(s.fid, r)
      }
      async remove(e, t, r) {
        this.budget.used = 0
        let s = await this.resolveFile(t)
        if (!this.reserve()) throw new Error("subrequest budget exceeded")
        await this.client.delFile(s.fid, s.pid || this.getRootId())
      }
      async move(e, t, r, s, n) {
        this.budget.used = 0
        let o = await this.resolveFile(s),
          a = await this.resolveFolderId(t)
        if (!this.reserve()) throw new Error("subrequest budget exceeded")
        await this.client.move(o.fid, a)
      }
      async copy(e, t, r, s, n) {
        this.budget.used = 0
        let o = await this.resolveFile(s),
          a = await this.resolveFolderId(t)
        if (!this.reserve()) throw new Error("subrequest budget exceeded")
        await this.client.copy(a, o.fid)
      }
      async put(e, t, r) {
        if (r.length < 1)
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
          d = r.length,
          l = (await gt(r)).toUpperCase(),
          u = Math.min(128 * 1024, d),
          p = (await gt(r.subarray(0, u))).toUpperCase()
        if (!this.reserve()) throw new Error("subrequest budget exceeded")
        let h = await this.client.uploadInit({
          fileName: n,
          fileSize: d,
          target: c,
          fileId: l,
          preId: p,
        })
        if (h.status === 2) return
        if ([6, 7, 8].includes(h.status) && h.sign_check) {
          let g = h.sign_check.split("-"),
            w = parseInt(g[0], 10),
            m = parseInt(g[1], 10)
          if (Number.isFinite(w) && Number.isFinite(m)) {
            let y = (await gt(r.subarray(w, m + 1))).toUpperCase()
            if (!this.reserve()) throw new Error("subrequest budget exceeded")
            if (
              ((h = await this.client.uploadInit({
                fileName: n,
                fileSize: d,
                target: c,
                fileId: l,
                preId: p,
                signKey: h.sign_key,
                signVal: y,
              })),
              h.status === 2)
            )
              return
          }
        }
        if (!this.reserve()) throw new Error("subrequest budget exceeded")
        let f = await this.client.uploadGetToken()
        if (!h.bucket || !h.object || !f.endpoint)
          throw new Error(
            "115 \u4E0A\u4F20\u521D\u59CB\u5316\u5931\u8D25\uFF1A\u7F3A\u5C11 OSS \u4E0A\u4F20\u4FE1\u606F",
          )
        await this.ossPutObject(f, h, r)
      }
      async ossPutObject(e, t, r) {
        let n = `${(e.endpoint.startsWith("http") ? e.endpoint : `https://${e.endpoint}`).replace(/\/$/, "")}/${t.object}`,
          o = Buffer.from(t.callback?.callback || "", "utf8").toString(
            "base64",
          ),
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
          p = `PUT

${d}
${c}
${l}${u}`,
          h = await wd(p, e.AccessKeySecret),
          f = await fetch(n, {
            method: "PUT",
            headers: {
              "Content-Type": d,
              Date: c,
              Authorization: `OSS ${e.AccessKeyId}:${h}`,
              "x-oss-security-token": e.SecurityToken,
              "x-oss-callback": o,
              "x-oss-callback-var": a,
              "Content-Length": String(r.length),
            },
            body: r,
          })
        if (!f.ok) {
          let g = (await f.text()).slice(0, 300)
          throw new Error(
            `115 OSS \u4E0A\u4F20\u5931\u8D25\uFF08HTTP ${f.status}\uFF09\uFF1A${g}`,
          )
        }
      }
    }
  })
function oe(i) {
  if (!i) return "/"
  let t = i
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "")
  return t ? "/" + t : "/"
}
function Je(i) {
  let e = oe(i)
  if (e === "/") return "/"
  let t = e.split("/").filter(Boolean)
  return (t.pop(), t.length ? "/" + t.join("/") : "/")
}
function ge(i) {
  let e = oe(i)
  if (e === "/") return ""
  let t = e.split("/").filter(Boolean)
  return t[t.length - 1] || ""
}
function Yt(...i) {
  return oe(i.join("/"))
}
function Et(i, e, t) {
  if (!i || !i.trim()) return `${e.UserName} ${t} ${e.ObjPath}`
  let r = i
  return (
    (r = r.replace(/\{\{\.UserName\}\}/g, e.UserName || "")),
    (r = r.replace(/\{\{\.ObjName\}\}/g, e.ObjName || "")),
    (r = r.replace(/\{\{\.ObjPath\}\}/g, e.ObjPath || "")),
    (r = r.replace(/\{\{\.ParentName\}\}/g, e.ParentName || "")),
    (r = r.replace(/\{\{\.ParentPath\}\}/g, e.ParentPath || "")),
    (r = r.replace(/\{\{\.TargetName\}\}/g, e.TargetName || "")),
    (r = r.replace(/\{\{\.TargetPath\}\}/g, e.TargetPath || "")),
    r
  )
}
function Dd(i, e) {
  let t = oe(i),
    r = oe(e),
    s = 1
  for (; s < t.length && s < r.length && t[s] === r[s]; ) s++
  let n = s
  for (; n < t.length && t[n] !== "/"; ) n++
  let o = s
  for (; o < r.length && r[o] !== "/"; ) o++
  for (; s > 0 && t[s] !== "/"; ) s--
  let a = oe(t.slice(0, s)),
    c = t.slice(s + 1, n),
    d = r.slice(s + 1, o),
    l = t.slice(s + 1),
    u = r.slice(s + 1)
  return { ancestor: a, aChildName: c, bChildName: d, aRest: l, bRest: u }
}
var $i,
  Ed = R(() => {
    "use strict"
    $i = class {
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
        let r = { ...this.headers, ...(t.headers || {}) },
          s
        t.body !== void 0 &&
          (typeof t.body == "string"
            ? (s = t.body)
            : ((s = JSON.stringify(t.body)),
              r["Content-Type"] || (r["Content-Type"] = "application/json")))
        let n = await fetch(e, {
          method: t.method || "GET",
          headers: r,
          body: s,
        })
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
        let t = oe(e)
        return `https://api.github.com/repos/${this.owner}/${this.repo}/contents${t === "/" ? "" : t}`
      }
      async getContents(e, t) {
        let r = new URL(this.getContentApiUrl(e))
        return (t && r.searchParams.set("ref", t), this.request(r.toString()))
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
        let r = await this.getContents(e, t)
        if (!r.entries && r.type !== "dir")
          throw new Error(`${e} is not a folder`)
        let s = await this.getTree(r.sha)
        if (s.truncated) throw new Error(`tree ${e} is truncated`)
        return { tree: s, dirSha: r.sha }
      }
      async newTree(e, t) {
        let r = { tree: t }
        return (
          e && (r.base_tree = e),
          (
            await this.request(
              `https://api.github.com/repos/${this.owner}/${this.repo}/git/trees`,
              {
                method: "POST",
                body: r,
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
      async createCommit(e, t, r, s, n) {
        let o = { message: e, tree: t, parents: [r] }
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
      async renewParentTrees(e, t, r, s, n) {
        let o = oe(e),
          a = oe(s)
        for (; o !== a; ) {
          o = Je(o)
          let { tree: c, dirSha: d } = await this.getTreeDirectly(o, n),
            l = c.tree.find((p) => p.sha === t)
          if (!l) throw new Error(`Object with sha ${t} not found in ${o}`)
          let u = { path: l.path, mode: l.mode, type: l.type, sha: r }
          ;((r = await this.newTree(d, [u])), (t = d))
        }
        return r
      }
    }
  })
var qi,
  Fd = R(() => {
    "use strict"
    ee()
    ie()
    Ed()
    qi = class {
      addition
      client
      isOnBranch = !1
      commitLock = Promise.resolve()
      constructor(e) {
        ;((this.addition = e), (this.client = new $i(e)))
      }
      async acquireLock(e) {
        let t = this.commitLock,
          r
        ;((this.commitLock = new Promise((s) => {
          r = s
        })),
          await t)
        try {
          return await e()
        } finally {
          r()
        }
      }
      formatDownloadUrl(e) {
        if (!e) return ""
        let t = (this.addition.gh_proxy || "").trim()
        return t ? e.replace("https://raw.githubusercontent.com", t) : e
      }
      async commitAndPush(e, t) {
        let r = this.addition.ref,
          s = await this.client.getBranchHead(r),
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
        await this.client.updateRef(r, a)
      }
      async init() {
        if (
          ((this.addition.root_folder_path = oe(
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
          throw new Error(
            "author_name and author_email must both be set or empty",
          )
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
        let r = oe(t),
          s = await this.client.getContents(r, this.addition.ref)
        if (!s.entries && s.type !== "dir")
          throw new Error(`${t} is not a folder`)
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
              type: z(a.path, c),
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
              type: z(o.name, a),
              raw_url: this.formatDownloadUrl(o.download_url),
            })
          }
        return N(n, this.addition.order_by, this.addition.order_direction)
      }
      async get(e, t) {
        let r = oe(t),
          s = await this.client.getContents(r, this.addition.ref)
        if (s.type === "submodule")
          throw new Error("cannot download a submodule")
        let n = s.type === "dir" || !!s.entries,
          o = s.name || ge(r) || "root"
        return {
          name: o,
          size: s.size || 0,
          is_dir: n,
          modified: new Date(0).toISOString(),
          sign: "",
          type: z(o, n),
          raw_url: this.formatDownloadUrl(s.download_url),
        }
      }
      async mkdir(e, t) {
        if (!this.isOnBranch)
          throw new Error("cannot write to non-branch reference")
        let r = oe(t),
          s = Je(r),
          n = ge(r)
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
            c.push({
              path: ".gitkeep",
              mode: "100644",
              type: "blob",
              sha: null,
            })
          let d = await this.client.newTree(o.sha, c),
            l = await this.client.renewParentTrees(
              s,
              o.sha,
              d,
              "/",
              this.addition.ref,
            ),
            u = Et(
              this.addition.mkdir_commit_message,
              {
                UserName: "OpenListNext",
                ObjName: n,
                ObjPath: r,
                ParentName: ge(s),
                ParentPath: s,
              },
              "mkdir",
            )
          await this.commitAndPush(u, l)
        })
      }
      async put(e, t, r) {
        if (!this.isOnBranch)
          throw new Error("cannot write to non-branch reference")
        let s = oe(t),
          n = Je(s),
          o = ge(s)
        await this.acquireLock(async () => {
          let a = await this.client.putBlob(r),
            c = await this.client.getContents(n, this.addition.ref)
          if (!c.entries && c.type !== "dir")
            throw new Error(`${n} is not a folder`)
          let d = [{ path: o, mode: "100644", type: "blob", sha: a }]
          c.entries?.length === 1 &&
            c.entries[0].name === ".gitkeep" &&
            d.push({
              path: ".gitkeep",
              mode: "100644",
              type: "blob",
              sha: null,
            })
          let l = await this.client.newTree(c.sha, d),
            u = await this.client.renewParentTrees(
              n,
              c.sha,
              l,
              "/",
              this.addition.ref,
            ),
            p = Et(
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
          await this.commitAndPush(p, u)
        })
      }
      async rename(e, t, r) {
        if (!this.isOnBranch)
          throw new Error("cannot write to non-branch reference")
        let s = oe(t),
          n = Je(s),
          o = ge(s)
        await this.acquireLock(async () => {
          let { tree: a, dirSha: c } = await this.client.getTreeDirectly(
              n,
              this.addition.ref,
            ),
            d = a.tree.find((g) => g.path === o)
          if (!d) throw new Error(`Object not found: ${s}`)
          if (d.type === "commit") throw new Error("cannot rename a submodule")
          let l = { path: o, mode: d.mode, type: d.type, sha: null },
            u = { path: r, mode: d.mode, type: d.type, sha: d.sha },
            p = await this.client.newTree(c, [l, u]),
            h = await this.client.renewParentTrees(
              n,
              c,
              p,
              "/",
              this.addition.ref,
            ),
            f = Et(
              this.addition.rename_commit_message,
              {
                UserName: "OpenListNext",
                ObjName: o,
                ObjPath: s,
                ParentName: ge(n),
                ParentPath: n,
                TargetName: r,
                TargetPath: Yt(n, r),
              },
              "rename",
            )
          await this.commitAndPush(f, h)
        })
      }
      async remove(e, t, r) {
        if (!this.isOnBranch)
          throw new Error("cannot write to non-branch reference")
        let s = oe(t),
          n = Je(s),
          o = ge(s)
        await this.acquireLock(async () => {
          let { tree: a, dirSha: c } = await this.client.getTreeDirectly(
              n,
              this.addition.ref,
            ),
            d = a.tree.find((f) => f.path === o)
          if (!d) throw new Error(`Object not found: ${s}`)
          if (d.type === "commit") throw new Error("cannot remove a submodule")
          let l = [{ path: o, mode: d.mode, type: d.type, sha: null }]
          a.tree.length === 1 &&
            l.push({
              path: ".gitkeep",
              mode: "100644",
              type: "blob",
              content: "",
            })
          let u = await this.client.newTree(c, l),
            p = await this.client.renewParentTrees(
              n,
              c,
              u,
              "/",
              this.addition.ref,
            ),
            h = Et(
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
          await this.commitAndPush(h, p)
        })
      }
      async move(e, t, r, s, n) {
        if (!this.isOnBranch)
          throw new Error("cannot write to non-branch reference")
        let o = oe(s),
          a = oe(t)
        if (a.startsWith(o)) throw new Error("cannot move parent dir to child")
        await this.acquireLock(async () => {
          let c = "",
            d = Je(o),
            l = ge(o)
          if (a.startsWith(d)) {
            let {
                dstOldSha: p,
                dstNewSha: h,
                ancestorOldSha: f,
                srcParentTree: g,
              } = await this.copyWithoutRenewTree(o, a),
              m = a.slice(d.length).replace(/^\//, "").split("/")[0],
              y = Yt(d, m),
              v = await this.client.renewParentTrees(
                a,
                p,
                h,
                y,
                this.addition.ref,
              ),
              x = g.tree.find((P) => P.path === l),
              _ = g.tree.find((P) => P.path === m)
            if (!x || !_) throw new Error("Object not found during move")
            let b = await this.client.newTree(f, [
              { path: x.path, mode: x.mode, type: x.type, sha: null },
              { path: _.path, mode: _.mode, type: _.type, sha: v },
            ])
            c = await this.client.renewParentTrees(
              d,
              f,
              b,
              "/",
              this.addition.ref,
            )
          } else if (o.startsWith(a)) {
            let { tree: p, dirSha: h } = await this.client.getTreeDirectly(
                d,
                this.addition.ref,
              ),
              f = p.tree.find((C) => C.path === l)
            if (!f) throw new Error("Object not found")
            if (f.type === "commit") throw new Error("cannot move a submodule")
            let g = [{ path: f.path, mode: f.mode, type: f.type, sha: null }]
            p.tree.length === 1 &&
              g.push({
                path: ".gitkeep",
                mode: "100644",
                type: "blob",
                content: "",
              })
            let w = await this.client.newTree(h, g),
              y = o.slice(a.length).replace(/^\//, "").split("/")[0]
            if (!y) throw new Error("cannot move in place")
            let v = Yt(a, y),
              x = await this.client.renewParentTrees(
                d,
                h,
                w,
                v,
                this.addition.ref,
              ),
              { tree: _, dirSha: b } = await this.client.getTreeDirectly(
                a,
                this.addition.ref,
              ),
              P = _.tree.find((C) => C.path === y)
            if (!P) throw new Error("Object not found")
            let A = await this.client.newTree(b, [
              { path: P.path, mode: P.mode, type: P.type, sha: x },
              { path: f.path, mode: f.mode, type: f.type, sha: f.sha },
            ])
            c = await this.client.renewParentTrees(
              a,
              b,
              A,
              "/",
              this.addition.ref,
            )
          } else {
            let {
                dstOldSha: p,
                dstNewSha: h,
                srcParentOldSha: f,
                srcParentTree: g,
              } = await this.copyWithoutRenewTree(o, a),
              w = g.tree.find((F) => F.path === l)
            if (!w) throw new Error("Object not found")
            let m = [{ path: w.path, mode: w.mode, type: w.type, sha: null }]
            g.tree.length === 1 &&
              m.push({
                path: ".gitkeep",
                mode: "100644",
                type: "blob",
                content: "",
              })
            let y = await this.client.newTree(f, m),
              { ancestor: v, aChildName: x, bChildName: _ } = Dd(o, a),
              b = await this.client.renewParentTrees(
                a,
                p,
                h,
                Yt(v, _),
                this.addition.ref,
              ),
              P = await this.client.renewParentTrees(
                d,
                f,
                y,
                Yt(v, x),
                this.addition.ref,
              ),
              { tree: A, dirSha: C } = await this.client.getTreeDirectly(
                v,
                this.addition.ref,
              ),
              S = A.tree.find((F) => F.path === x),
              k = A.tree.find((F) => F.path === _)
            if (!S || !k) throw new Error("Ancestor child tree not found")
            let D = await this.client.newTree(C, [
              { path: S.path, mode: S.mode, type: S.type, sha: P },
              { path: k.path, mode: k.mode, type: k.type, sha: b },
            ])
            c = await this.client.renewParentTrees(
              v,
              C,
              D,
              "/",
              this.addition.ref,
            )
          }
          let u = Et(
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
      async copy(e, t, r, s, n) {
        if (!this.isOnBranch)
          throw new Error("cannot write to non-branch reference")
        let o = oe(s),
          a = oe(t)
        if (a.startsWith(o)) throw new Error("cannot copy parent dir to child")
        await this.acquireLock(async () => {
          let { dstOldSha: c, dstNewSha: d } = await this.copyWithoutRenewTree(
              o,
              a,
            ),
            l = await this.client.renewParentTrees(
              a,
              c,
              d,
              "/",
              this.addition.ref,
            ),
            u = Et(
              this.addition.copy_commit_message,
              {
                UserName: "OpenListNext",
                ObjName: ge(o),
                ObjPath: o,
                ParentName: ge(Je(o)),
                ParentPath: Je(o),
                TargetName: ge(a),
                TargetPath: a,
              },
              "copy",
            )
          await this.commitAndPush(u, l)
        })
      }
      async copyWithoutRenewTree(e, t) {
        let r = await this.client.getContents(t, this.addition.ref)
        if (!r.entries && r.type !== "dir")
          throw new Error(`${t} is not a folder`)
        let s = Je(e),
          n = ge(e),
          { tree: o, dirSha: a } = await this.client.getTreeDirectly(
            s,
            this.addition.ref,
          ),
          c = o.tree.find((u) => u.path === n)
        if (!c) throw new Error(`Object not found: ${e}`)
        if (c.type === "commit") throw new Error("cannot copy a submodule")
        let d = [{ path: c.path, mode: c.mode, type: c.type, sha: c.sha }]
        r.entries?.length === 1 &&
          r.entries[0].name === ".gitkeep" &&
          d.push({ path: ".gitkeep", mode: "100644", type: "blob", sha: null })
        let l = await this.client.newTree(r.sha, d)
        return {
          dstOldSha: r.sha,
          dstNewSha: l,
          srcParentOldSha: a,
          srcParentTree: o,
          ancestorOldSha: a,
        }
      }
    }
  })
var K = W((Oi, Id) => {
  ;(function (i, e) {
    typeof Oi == "object"
      ? (Id.exports = Oi = e())
      : typeof define == "function" && define.amd
        ? define([], e)
        : (i.CryptoJS = e())
  })(Oi, function () {
    var i =
      i ||
      (function (e, t) {
        var r
        if (
          (typeof window < "u" && window.crypto && (r = window.crypto),
          typeof self < "u" && self.crypto && (r = self.crypto),
          typeof globalThis < "u" &&
            globalThis.crypto &&
            (r = globalThis.crypto),
          !r && typeof window < "u" && window.msCrypto && (r = window.msCrypto),
          !r && typeof global < "u" && global.crypto && (r = global.crypto),
          !r && typeof gr == "function")
        )
          try {
            r = gr("crypto")
          } catch {}
        var s = function () {
            if (r) {
              if (typeof r.getRandomValues == "function")
                try {
                  return r.getRandomValues(new Uint32Array(1))[0]
                } catch {}
              if (typeof r.randomBytes == "function")
                try {
                  return r.randomBytes(4).readInt32LE()
                } catch {}
            }
            throw new Error(
              "Native crypto module could not be used to get secure random number.",
            )
          },
          n =
            Object.create ||
            (function () {
              function m() {}
              return function (y) {
                var v
                return (
                  (m.prototype = y),
                  (v = new m()),
                  (m.prototype = null),
                  v
                )
              }
            })(),
          o = {},
          a = (o.lib = {}),
          c = (a.Base = (function () {
            return {
              extend: function (m) {
                var y = n(this)
                return (
                  m && y.mixIn(m),
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
                var m = this.extend()
                return (m.init.apply(m, arguments), m)
              },
              init: function () {},
              mixIn: function (m) {
                for (var y in m) m.hasOwnProperty(y) && (this[y] = m[y])
                m.hasOwnProperty("toString") && (this.toString = m.toString)
              },
              clone: function () {
                return this.init.prototype.extend(this)
              },
            }
          })()),
          d = (a.WordArray = c.extend({
            init: function (m, y) {
              ;((m = this.words = m || []),
                y != t ? (this.sigBytes = y) : (this.sigBytes = m.length * 4))
            },
            toString: function (m) {
              return (m || u).stringify(this)
            },
            concat: function (m) {
              var y = this.words,
                v = m.words,
                x = this.sigBytes,
                _ = m.sigBytes
              if ((this.clamp(), x % 4))
                for (var b = 0; b < _; b++) {
                  var P = (v[b >>> 2] >>> (24 - (b % 4) * 8)) & 255
                  y[(x + b) >>> 2] |= P << (24 - ((x + b) % 4) * 8)
                }
              else for (var A = 0; A < _; A += 4) y[(x + A) >>> 2] = v[A >>> 2]
              return ((this.sigBytes += _), this)
            },
            clamp: function () {
              var m = this.words,
                y = this.sigBytes
              ;((m[y >>> 2] &= 4294967295 << (32 - (y % 4) * 8)),
                (m.length = e.ceil(y / 4)))
            },
            clone: function () {
              var m = c.clone.call(this)
              return ((m.words = this.words.slice(0)), m)
            },
            random: function (m) {
              for (var y = [], v = 0; v < m; v += 4) y.push(s())
              return new d.init(y, m)
            },
          })),
          l = (o.enc = {}),
          u = (l.Hex = {
            stringify: function (m) {
              for (var y = m.words, v = m.sigBytes, x = [], _ = 0; _ < v; _++) {
                var b = (y[_ >>> 2] >>> (24 - (_ % 4) * 8)) & 255
                ;(x.push((b >>> 4).toString(16)), x.push((b & 15).toString(16)))
              }
              return x.join("")
            },
            parse: function (m) {
              for (var y = m.length, v = [], x = 0; x < y; x += 2)
                v[x >>> 3] |= parseInt(m.substr(x, 2), 16) << (24 - (x % 8) * 4)
              return new d.init(v, y / 2)
            },
          }),
          p = (l.Latin1 = {
            stringify: function (m) {
              for (var y = m.words, v = m.sigBytes, x = [], _ = 0; _ < v; _++) {
                var b = (y[_ >>> 2] >>> (24 - (_ % 4) * 8)) & 255
                x.push(String.fromCharCode(b))
              }
              return x.join("")
            },
            parse: function (m) {
              for (var y = m.length, v = [], x = 0; x < y; x++)
                v[x >>> 2] |= (m.charCodeAt(x) & 255) << (24 - (x % 4) * 8)
              return new d.init(v, y)
            },
          }),
          h = (l.Utf8 = {
            stringify: function (m) {
              try {
                return decodeURIComponent(escape(p.stringify(m)))
              } catch {
                throw new Error("Malformed UTF-8 data")
              }
            },
            parse: function (m) {
              return p.parse(unescape(encodeURIComponent(m)))
            },
          }),
          f = (a.BufferedBlockAlgorithm = c.extend({
            reset: function () {
              ;((this._data = new d.init()), (this._nDataBytes = 0))
            },
            _append: function (m) {
              ;(typeof m == "string" && (m = h.parse(m)),
                this._data.concat(m),
                (this._nDataBytes += m.sigBytes))
            },
            _process: function (m) {
              var y,
                v = this._data,
                x = v.words,
                _ = v.sigBytes,
                b = this.blockSize,
                P = b * 4,
                A = _ / P
              m
                ? (A = e.ceil(A))
                : (A = e.max((A | 0) - this._minBufferSize, 0))
              var C = A * b,
                S = e.min(C * 4, _)
              if (C) {
                for (var k = 0; k < C; k += b) this._doProcessBlock(x, k)
                ;((y = x.splice(0, C)), (v.sigBytes -= S))
              }
              return new d.init(y, S)
            },
            clone: function () {
              var m = c.clone.call(this)
              return ((m._data = this._data.clone()), m)
            },
            _minBufferSize: 0,
          })),
          g = (a.Hasher = f.extend({
            cfg: c.extend(),
            init: function (m) {
              ;((this.cfg = this.cfg.extend(m)), this.reset())
            },
            reset: function () {
              ;(f.reset.call(this), this._doReset())
            },
            update: function (m) {
              return (this._append(m), this._process(), this)
            },
            finalize: function (m) {
              m && this._append(m)
              var y = this._doFinalize()
              return y
            },
            blockSize: 512 / 32,
            _createHelper: function (m) {
              return function (y, v) {
                return new m.init(v).finalize(y)
              }
            },
            _createHmacHelper: function (m) {
              return function (y, v) {
                return new w.HMAC.init(m, v).finalize(y)
              }
            },
          })),
          w = (o.algo = {})
        return o
      })(Math)
    return i
  })
})
var Br = W((ji, Rd) => {
  ;(function (i, e) {
    typeof ji == "object"
      ? (Rd.exports = ji = e(K()))
      : typeof define == "function" && define.amd
        ? define(["./core"], e)
        : e(i.CryptoJS)
  })(ji, function (i) {
    return (
      (function (e) {
        var t = i,
          r = t.lib,
          s = r.Base,
          n = r.WordArray,
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
                var d = this.words, l = d.length, u = [], p = 0;
                p < l;
                p++
              ) {
                var h = d[p]
                ;(u.push(h.high), u.push(h.low))
              }
              return n.create(u, this.sigBytes)
            },
            clone: function () {
              for (
                var d = s.clone.call(this),
                  l = (d.words = this.words.slice(0)),
                  u = l.length,
                  p = 0;
                p < u;
                p++
              )
                l[p] = l[p].clone()
              return d
            },
          }))
      })(),
      i
    )
  })
})
var Ud = W((zi, Bd) => {
  ;(function (i, e) {
    typeof zi == "object"
      ? (Bd.exports = zi = e(K()))
      : typeof define == "function" && define.amd
        ? define(["./core"], e)
        : e(i.CryptoJS)
  })(zi, function (i) {
    return (
      (function () {
        if (typeof ArrayBuffer == "function") {
          var e = i,
            t = e.lib,
            r = t.WordArray,
            s = r.init,
            n = (r.init = function (o) {
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
          n.prototype = r
        }
      })(),
      i.lib.WordArray
    )
  })
})
var qd = W((Li, $d) => {
  ;(function (i, e) {
    typeof Li == "object"
      ? ($d.exports = Li = e(K()))
      : typeof define == "function" && define.amd
        ? define(["./core"], e)
        : e(i.CryptoJS)
  })(Li, function (i) {
    return (
      (function () {
        var e = i,
          t = e.lib,
          r = t.WordArray,
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
                    var p = (c[u >>> 2] >>> (16 - (u % 4) * 8)) & 65535
                    l.push(String.fromCharCode(p))
                  }
                  return l.join("")
                },
                parse: function (a) {
                  for (var c = a.length, d = [], l = 0; l < c; l++)
                    d[l >>> 1] |= a.charCodeAt(l) << (16 - (l % 2) * 16)
                  return r.create(d, c * 2)
                },
              })
        s.Utf16LE = {
          stringify: function (a) {
            for (
              var c = a.words, d = a.sigBytes, l = [], u = 0;
              u < d;
              u += 2
            ) {
              var p = o((c[u >>> 2] >>> (16 - (u % 4) * 8)) & 65535)
              l.push(String.fromCharCode(p))
            }
            return l.join("")
          },
          parse: function (a) {
            for (var c = a.length, d = [], l = 0; l < c; l++)
              d[l >>> 1] |= o(a.charCodeAt(l) << (16 - (l % 2) * 16))
            return r.create(d, c * 2)
          },
        }
        function o(a) {
          return ((a << 8) & 4278255360) | ((a >>> 8) & 16711935)
        }
      })(),
      i.enc.Utf16
    )
  })
})
var wt = W((Ni, Od) => {
  ;(function (i, e) {
    typeof Ni == "object"
      ? (Od.exports = Ni = e(K()))
      : typeof define == "function" && define.amd
        ? define(["./core"], e)
        : e(i.CryptoJS)
  })(Ni, function (i) {
    return (
      (function () {
        var e = i,
          t = e.lib,
          r = t.WordArray,
          s = e.enc,
          n = (s.Base64 = {
            stringify: function (a) {
              var c = a.words,
                d = a.sigBytes,
                l = this._map
              a.clamp()
              for (var u = [], p = 0; p < d; p += 3)
                for (
                  var h = (c[p >>> 2] >>> (24 - (p % 4) * 8)) & 255,
                    f = (c[(p + 1) >>> 2] >>> (24 - ((p + 1) % 4) * 8)) & 255,
                    g = (c[(p + 2) >>> 2] >>> (24 - ((p + 2) % 4) * 8)) & 255,
                    w = (h << 16) | (f << 8) | g,
                    m = 0;
                  m < 4 && p + m * 0.75 < d;
                  m++
                )
                  u.push(l.charAt((w >>> (6 * (3 - m))) & 63))
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
              var p = d.charAt(64)
              if (p) {
                var h = a.indexOf(p)
                h !== -1 && (c = h)
              }
              return o(a, c, l)
            },
            _map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
          })
        function o(a, c, d) {
          for (var l = [], u = 0, p = 0; p < c; p++)
            if (p % 4) {
              var h = d[a.charCodeAt(p - 1)] << ((p % 4) * 2),
                f = d[a.charCodeAt(p)] >>> (6 - (p % 4) * 2),
                g = h | f
              ;((l[u >>> 2] |= g << (24 - (u % 4) * 8)), u++)
            }
          return r.create(l, u)
        }
      })(),
      i.enc.Base64
    )
  })
})
var zd = W((Mi, jd) => {
  ;(function (i, e) {
    typeof Mi == "object"
      ? (jd.exports = Mi = e(K()))
      : typeof define == "function" && define.amd
        ? define(["./core"], e)
        : e(i.CryptoJS)
  })(Mi, function (i) {
    return (
      (function () {
        var e = i,
          t = e.lib,
          r = t.WordArray,
          s = e.enc,
          n = (s.Base64url = {
            stringify: function (a, c) {
              c === void 0 && (c = !0)
              var d = a.words,
                l = a.sigBytes,
                u = c ? this._safe_map : this._map
              a.clamp()
              for (var p = [], h = 0; h < l; h += 3)
                for (
                  var f = (d[h >>> 2] >>> (24 - (h % 4) * 8)) & 255,
                    g = (d[(h + 1) >>> 2] >>> (24 - ((h + 1) % 4) * 8)) & 255,
                    w = (d[(h + 2) >>> 2] >>> (24 - ((h + 2) % 4) * 8)) & 255,
                    m = (f << 16) | (g << 8) | w,
                    y = 0;
                  y < 4 && h + y * 0.75 < l;
                  y++
                )
                  p.push(u.charAt((m >>> (6 * (3 - y))) & 63))
              var v = u.charAt(64)
              if (v) for (; p.length % 4; ) p.push(v)
              return p.join("")
            },
            parse: function (a, c) {
              c === void 0 && (c = !0)
              var d = a.length,
                l = c ? this._safe_map : this._map,
                u = this._reverseMap
              if (!u) {
                u = this._reverseMap = []
                for (var p = 0; p < l.length; p++) u[l.charCodeAt(p)] = p
              }
              var h = l.charAt(64)
              if (h) {
                var f = a.indexOf(h)
                f !== -1 && (d = f)
              }
              return o(a, d, u)
            },
            _map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
            _safe_map:
              "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
          })
        function o(a, c, d) {
          for (var l = [], u = 0, p = 0; p < c; p++)
            if (p % 4) {
              var h = d[a.charCodeAt(p - 1)] << ((p % 4) * 2),
                f = d[a.charCodeAt(p)] >>> (6 - (p % 4) * 2),
                g = h | f
              ;((l[u >>> 2] |= g << (24 - (u % 4) * 8)), u++)
            }
          return r.create(l, u)
        }
      })(),
      i.enc.Base64url
    )
  })
})
var xt = W((Hi, Ld) => {
  ;(function (i, e) {
    typeof Hi == "object"
      ? (Ld.exports = Hi = e(K()))
      : typeof define == "function" && define.amd
        ? define(["./core"], e)
        : e(i.CryptoJS)
  })(Hi, function (i) {
    return (
      (function (e) {
        var t = i,
          r = t.lib,
          s = r.WordArray,
          n = r.Hasher,
          o = t.algo,
          a = []
        ;(function () {
          for (var h = 0; h < 64; h++)
            a[h] = (e.abs(e.sin(h + 1)) * 4294967296) | 0
        })()
        var c = (o.MD5 = n.extend({
          _doReset: function () {
            this._hash = new s.init([
              1732584193, 4023233417, 2562383102, 271733878,
            ])
          },
          _doProcessBlock: function (h, f) {
            for (var g = 0; g < 16; g++) {
              var w = f + g,
                m = h[w]
              h[w] =
                (((m << 8) | (m >>> 24)) & 16711935) |
                (((m << 24) | (m >>> 8)) & 4278255360)
            }
            var y = this._hash.words,
              v = h[f + 0],
              x = h[f + 1],
              _ = h[f + 2],
              b = h[f + 3],
              P = h[f + 4],
              A = h[f + 5],
              C = h[f + 6],
              S = h[f + 7],
              k = h[f + 8],
              D = h[f + 9],
              F = h[f + 10],
              T = h[f + 11],
              O = h[f + 12],
              q = h[f + 13],
              L = h[f + 14],
              G = h[f + 15],
              E = y[0],
              B = y[1],
              U = y[2],
              I = y[3]
            ;((E = d(E, B, U, I, v, 7, a[0])),
              (I = d(I, E, B, U, x, 12, a[1])),
              (U = d(U, I, E, B, _, 17, a[2])),
              (B = d(B, U, I, E, b, 22, a[3])),
              (E = d(E, B, U, I, P, 7, a[4])),
              (I = d(I, E, B, U, A, 12, a[5])),
              (U = d(U, I, E, B, C, 17, a[6])),
              (B = d(B, U, I, E, S, 22, a[7])),
              (E = d(E, B, U, I, k, 7, a[8])),
              (I = d(I, E, B, U, D, 12, a[9])),
              (U = d(U, I, E, B, F, 17, a[10])),
              (B = d(B, U, I, E, T, 22, a[11])),
              (E = d(E, B, U, I, O, 7, a[12])),
              (I = d(I, E, B, U, q, 12, a[13])),
              (U = d(U, I, E, B, L, 17, a[14])),
              (B = d(B, U, I, E, G, 22, a[15])),
              (E = l(E, B, U, I, x, 5, a[16])),
              (I = l(I, E, B, U, C, 9, a[17])),
              (U = l(U, I, E, B, T, 14, a[18])),
              (B = l(B, U, I, E, v, 20, a[19])),
              (E = l(E, B, U, I, A, 5, a[20])),
              (I = l(I, E, B, U, F, 9, a[21])),
              (U = l(U, I, E, B, G, 14, a[22])),
              (B = l(B, U, I, E, P, 20, a[23])),
              (E = l(E, B, U, I, D, 5, a[24])),
              (I = l(I, E, B, U, L, 9, a[25])),
              (U = l(U, I, E, B, b, 14, a[26])),
              (B = l(B, U, I, E, k, 20, a[27])),
              (E = l(E, B, U, I, q, 5, a[28])),
              (I = l(I, E, B, U, _, 9, a[29])),
              (U = l(U, I, E, B, S, 14, a[30])),
              (B = l(B, U, I, E, O, 20, a[31])),
              (E = u(E, B, U, I, A, 4, a[32])),
              (I = u(I, E, B, U, k, 11, a[33])),
              (U = u(U, I, E, B, T, 16, a[34])),
              (B = u(B, U, I, E, L, 23, a[35])),
              (E = u(E, B, U, I, x, 4, a[36])),
              (I = u(I, E, B, U, P, 11, a[37])),
              (U = u(U, I, E, B, S, 16, a[38])),
              (B = u(B, U, I, E, F, 23, a[39])),
              (E = u(E, B, U, I, q, 4, a[40])),
              (I = u(I, E, B, U, v, 11, a[41])),
              (U = u(U, I, E, B, b, 16, a[42])),
              (B = u(B, U, I, E, C, 23, a[43])),
              (E = u(E, B, U, I, D, 4, a[44])),
              (I = u(I, E, B, U, O, 11, a[45])),
              (U = u(U, I, E, B, G, 16, a[46])),
              (B = u(B, U, I, E, _, 23, a[47])),
              (E = p(E, B, U, I, v, 6, a[48])),
              (I = p(I, E, B, U, S, 10, a[49])),
              (U = p(U, I, E, B, L, 15, a[50])),
              (B = p(B, U, I, E, A, 21, a[51])),
              (E = p(E, B, U, I, O, 6, a[52])),
              (I = p(I, E, B, U, b, 10, a[53])),
              (U = p(U, I, E, B, F, 15, a[54])),
              (B = p(B, U, I, E, x, 21, a[55])),
              (E = p(E, B, U, I, k, 6, a[56])),
              (I = p(I, E, B, U, G, 10, a[57])),
              (U = p(U, I, E, B, C, 15, a[58])),
              (B = p(B, U, I, E, q, 21, a[59])),
              (E = p(E, B, U, I, P, 6, a[60])),
              (I = p(I, E, B, U, T, 10, a[61])),
              (U = p(U, I, E, B, _, 15, a[62])),
              (B = p(B, U, I, E, D, 21, a[63])),
              (y[0] = (y[0] + E) | 0),
              (y[1] = (y[1] + B) | 0),
              (y[2] = (y[2] + U) | 0),
              (y[3] = (y[3] + I) | 0))
          },
          _doFinalize: function () {
            var h = this._data,
              f = h.words,
              g = this._nDataBytes * 8,
              w = h.sigBytes * 8
            f[w >>> 5] |= 128 << (24 - (w % 32))
            var m = e.floor(g / 4294967296),
              y = g
            ;((f[(((w + 64) >>> 9) << 4) + 15] =
              (((m << 8) | (m >>> 24)) & 16711935) |
              (((m << 24) | (m >>> 8)) & 4278255360)),
              (f[(((w + 64) >>> 9) << 4) + 14] =
                (((y << 8) | (y >>> 24)) & 16711935) |
                (((y << 24) | (y >>> 8)) & 4278255360)),
              (h.sigBytes = (f.length + 1) * 4),
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
            var h = n.clone.call(this)
            return ((h._hash = this._hash.clone()), h)
          },
        }))
        function d(h, f, g, w, m, y, v) {
          var x = h + ((f & g) | (~f & w)) + m + v
          return ((x << y) | (x >>> (32 - y))) + f
        }
        function l(h, f, g, w, m, y, v) {
          var x = h + ((f & w) | (g & ~w)) + m + v
          return ((x << y) | (x >>> (32 - y))) + f
        }
        function u(h, f, g, w, m, y, v) {
          var x = h + (f ^ g ^ w) + m + v
          return ((x << y) | (x >>> (32 - y))) + f
        }
        function p(h, f, g, w, m, y, v) {
          var x = h + (g ^ (f | ~w)) + m + v
          return ((x << y) | (x >>> (32 - y))) + f
        }
        ;((t.MD5 = n._createHelper(c)), (t.HmacMD5 = n._createHmacHelper(c)))
      })(Math),
      i.MD5
    )
  })
})
var oo = W((Wi, Nd) => {
  ;(function (i, e) {
    typeof Wi == "object"
      ? (Nd.exports = Wi = e(K()))
      : typeof define == "function" && define.amd
        ? define(["./core"], e)
        : e(i.CryptoJS)
  })(Wi, function (i) {
    return (
      (function () {
        var e = i,
          t = e.lib,
          r = t.WordArray,
          s = t.Hasher,
          n = e.algo,
          o = [],
          a = (n.SHA1 = s.extend({
            _doReset: function () {
              this._hash = new r.init([
                1732584193, 4023233417, 2562383102, 271733878, 3285377520,
              ])
            },
            _doProcessBlock: function (c, d) {
              for (
                var l = this._hash.words,
                  u = l[0],
                  p = l[1],
                  h = l[2],
                  f = l[3],
                  g = l[4],
                  w = 0;
                w < 80;
                w++
              ) {
                if (w < 16) o[w] = c[d + w] | 0
                else {
                  var m = o[w - 3] ^ o[w - 8] ^ o[w - 14] ^ o[w - 16]
                  o[w] = (m << 1) | (m >>> 31)
                }
                var y = ((u << 5) | (u >>> 27)) + g + o[w]
                ;(w < 20
                  ? (y += ((p & h) | (~p & f)) + 1518500249)
                  : w < 40
                    ? (y += (p ^ h ^ f) + 1859775393)
                    : w < 60
                      ? (y += ((p & h) | (p & f) | (h & f)) - 1894007588)
                      : (y += (p ^ h ^ f) - 899497514),
                  (g = f),
                  (f = h),
                  (h = (p << 30) | (p >>> 2)),
                  (p = u),
                  (u = y))
              }
              ;((l[0] = (l[0] + u) | 0),
                (l[1] = (l[1] + p) | 0),
                (l[2] = (l[2] + h) | 0),
                (l[3] = (l[3] + f) | 0),
                (l[4] = (l[4] + g) | 0))
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
      i.SHA1
    )
  })
})
var Gi = W((Ki, Md) => {
  ;(function (i, e) {
    typeof Ki == "object"
      ? (Md.exports = Ki = e(K()))
      : typeof define == "function" && define.amd
        ? define(["./core"], e)
        : e(i.CryptoJS)
  })(Ki, function (i) {
    return (
      (function (e) {
        var t = i,
          r = t.lib,
          s = r.WordArray,
          n = r.Hasher,
          o = t.algo,
          a = [],
          c = []
        ;(function () {
          function u(g) {
            for (var w = e.sqrt(g), m = 2; m <= w; m++) if (!(g % m)) return !1
            return !0
          }
          function p(g) {
            return ((g - (g | 0)) * 4294967296) | 0
          }
          for (var h = 2, f = 0; f < 64; )
            (u(h) &&
              (f < 8 && (a[f] = p(e.pow(h, 1 / 2))),
              (c[f] = p(e.pow(h, 1 / 3))),
              f++),
              h++)
        })()
        var d = [],
          l = (o.SHA256 = n.extend({
            _doReset: function () {
              this._hash = new s.init(a.slice(0))
            },
            _doProcessBlock: function (u, p) {
              for (
                var h = this._hash.words,
                  f = h[0],
                  g = h[1],
                  w = h[2],
                  m = h[3],
                  y = h[4],
                  v = h[5],
                  x = h[6],
                  _ = h[7],
                  b = 0;
                b < 64;
                b++
              ) {
                if (b < 16) d[b] = u[p + b] | 0
                else {
                  var P = d[b - 15],
                    A =
                      ((P << 25) | (P >>> 7)) ^
                      ((P << 14) | (P >>> 18)) ^
                      (P >>> 3),
                    C = d[b - 2],
                    S =
                      ((C << 15) | (C >>> 17)) ^
                      ((C << 13) | (C >>> 19)) ^
                      (C >>> 10)
                  d[b] = A + d[b - 7] + S + d[b - 16]
                }
                var k = (y & v) ^ (~y & x),
                  D = (f & g) ^ (f & w) ^ (g & w),
                  F =
                    ((f << 30) | (f >>> 2)) ^
                    ((f << 19) | (f >>> 13)) ^
                    ((f << 10) | (f >>> 22)),
                  T =
                    ((y << 26) | (y >>> 6)) ^
                    ((y << 21) | (y >>> 11)) ^
                    ((y << 7) | (y >>> 25)),
                  O = _ + T + k + c[b] + d[b],
                  q = F + D
                ;((_ = x),
                  (x = v),
                  (v = y),
                  (y = (m + O) | 0),
                  (m = w),
                  (w = g),
                  (g = f),
                  (f = (O + q) | 0))
              }
              ;((h[0] = (h[0] + f) | 0),
                (h[1] = (h[1] + g) | 0),
                (h[2] = (h[2] + w) | 0),
                (h[3] = (h[3] + m) | 0),
                (h[4] = (h[4] + y) | 0),
                (h[5] = (h[5] + v) | 0),
                (h[6] = (h[6] + x) | 0),
                (h[7] = (h[7] + _) | 0))
            },
            _doFinalize: function () {
              var u = this._data,
                p = u.words,
                h = this._nDataBytes * 8,
                f = u.sigBytes * 8
              return (
                (p[f >>> 5] |= 128 << (24 - (f % 32))),
                (p[(((f + 64) >>> 9) << 4) + 14] = e.floor(h / 4294967296)),
                (p[(((f + 64) >>> 9) << 4) + 15] = h),
                (u.sigBytes = p.length * 4),
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
      i.SHA256
    )
  })
})
var Wd = W((Vi, Hd) => {
  ;(function (i, e, t) {
    typeof Vi == "object"
      ? (Hd.exports = Vi = e(K(), Gi()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./sha256"], e)
        : e(i.CryptoJS)
  })(Vi, function (i) {
    return (
      (function () {
        var e = i,
          t = e.lib,
          r = t.WordArray,
          s = e.algo,
          n = s.SHA256,
          o = (s.SHA224 = n.extend({
            _doReset: function () {
              this._hash = new r.init([
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
      i.SHA224
    )
  })
})
var ao = W((Ji, Kd) => {
  ;(function (i, e, t) {
    typeof Ji == "object"
      ? (Kd.exports = Ji = e(K(), Br()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./x64-core"], e)
        : e(i.CryptoJS)
  })(Ji, function (i) {
    return (
      (function () {
        var e = i,
          t = e.lib,
          r = t.Hasher,
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
          for (var p = 0; p < 80; p++) l[p] = c()
        })()
        var u = (a.SHA512 = r.extend({
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
          _doProcessBlock: function (p, h) {
            for (
              var f = this._hash.words,
                g = f[0],
                w = f[1],
                m = f[2],
                y = f[3],
                v = f[4],
                x = f[5],
                _ = f[6],
                b = f[7],
                P = g.high,
                A = g.low,
                C = w.high,
                S = w.low,
                k = m.high,
                D = m.low,
                F = y.high,
                T = y.low,
                O = v.high,
                q = v.low,
                L = x.high,
                G = x.low,
                E = _.high,
                B = _.low,
                U = b.high,
                I = b.low,
                Y = P,
                V = A,
                be = C,
                H = S,
                dr = k,
                Mt = D,
                xn = F,
                lr = T,
                $e = O,
                Ce = q,
                ei = L,
                ur = G,
                ti = E,
                pr = B,
                _n = U,
                hr = I,
                qe = 0;
              qe < 80;
              qe++
            ) {
              var Re,
                lt,
                ri = l[qe]
              if (qe < 16)
                ((lt = ri.high = p[h + qe * 2] | 0),
                  (Re = ri.low = p[h + qe * 2 + 1] | 0))
              else {
                var Pa = l[qe - 15],
                  Ht = Pa.high,
                  fr = Pa.low,
                  Np =
                    ((Ht >>> 1) | (fr << 31)) ^
                    ((Ht >>> 8) | (fr << 24)) ^
                    (Ht >>> 7),
                  Sa =
                    ((fr >>> 1) | (Ht << 31)) ^
                    ((fr >>> 8) | (Ht << 24)) ^
                    ((fr >>> 7) | (Ht << 25)),
                  Aa = l[qe - 2],
                  Wt = Aa.high,
                  mr = Aa.low,
                  Mp =
                    ((Wt >>> 19) | (mr << 13)) ^
                    ((Wt << 3) | (mr >>> 29)) ^
                    (Wt >>> 6),
                  Ca =
                    ((mr >>> 19) | (Wt << 13)) ^
                    ((mr << 3) | (Wt >>> 29)) ^
                    ((mr >>> 6) | (Wt << 26)),
                  Ta = l[qe - 7],
                  Hp = Ta.high,
                  Wp = Ta.low,
                  Da = l[qe - 16],
                  Kp = Da.high,
                  Ea = Da.low
                ;((Re = Sa + Wp),
                  (lt = Np + Hp + (Re >>> 0 < Sa >>> 0 ? 1 : 0)),
                  (Re = Re + Ca),
                  (lt = lt + Mp + (Re >>> 0 < Ca >>> 0 ? 1 : 0)),
                  (Re = Re + Ea),
                  (lt = lt + Kp + (Re >>> 0 < Ea >>> 0 ? 1 : 0)),
                  (ri.high = lt),
                  (ri.low = Re))
              }
              var Gp = ($e & ei) ^ (~$e & ti),
                Fa = (Ce & ur) ^ (~Ce & pr),
                Vp = (Y & be) ^ (Y & dr) ^ (be & dr),
                Jp = (V & H) ^ (V & Mt) ^ (H & Mt),
                Qp =
                  ((Y >>> 28) | (V << 4)) ^
                  ((Y << 30) | (V >>> 2)) ^
                  ((Y << 25) | (V >>> 7)),
                Ia =
                  ((V >>> 28) | (Y << 4)) ^
                  ((V << 30) | (Y >>> 2)) ^
                  ((V << 25) | (Y >>> 7)),
                Xp =
                  (($e >>> 14) | (Ce << 18)) ^
                  (($e >>> 18) | (Ce << 14)) ^
                  (($e << 23) | (Ce >>> 9)),
                Yp =
                  ((Ce >>> 14) | ($e << 18)) ^
                  ((Ce >>> 18) | ($e << 14)) ^
                  ((Ce << 23) | ($e >>> 9)),
                Ra = d[qe],
                Zp = Ra.high,
                Ba = Ra.low,
                Te = hr + Yp,
                ut = _n + Xp + (Te >>> 0 < hr >>> 0 ? 1 : 0),
                Te = Te + Fa,
                ut = ut + Gp + (Te >>> 0 < Fa >>> 0 ? 1 : 0),
                Te = Te + Ba,
                ut = ut + Zp + (Te >>> 0 < Ba >>> 0 ? 1 : 0),
                Te = Te + Re,
                ut = ut + lt + (Te >>> 0 < Re >>> 0 ? 1 : 0),
                Ua = Ia + Jp,
                eh = Qp + Vp + (Ua >>> 0 < Ia >>> 0 ? 1 : 0)
              ;((_n = ti),
                (hr = pr),
                (ti = ei),
                (pr = ur),
                (ei = $e),
                (ur = Ce),
                (Ce = (lr + Te) | 0),
                ($e = (xn + ut + (Ce >>> 0 < lr >>> 0 ? 1 : 0)) | 0),
                (xn = dr),
                (lr = Mt),
                (dr = be),
                (Mt = H),
                (be = Y),
                (H = V),
                (V = (Te + Ua) | 0),
                (Y = (ut + eh + (V >>> 0 < Te >>> 0 ? 1 : 0)) | 0))
            }
            ;((A = g.low = A + V),
              (g.high = P + Y + (A >>> 0 < V >>> 0 ? 1 : 0)),
              (S = w.low = S + H),
              (w.high = C + be + (S >>> 0 < H >>> 0 ? 1 : 0)),
              (D = m.low = D + Mt),
              (m.high = k + dr + (D >>> 0 < Mt >>> 0 ? 1 : 0)),
              (T = y.low = T + lr),
              (y.high = F + xn + (T >>> 0 < lr >>> 0 ? 1 : 0)),
              (q = v.low = q + Ce),
              (v.high = O + $e + (q >>> 0 < Ce >>> 0 ? 1 : 0)),
              (G = x.low = G + ur),
              (x.high = L + ei + (G >>> 0 < ur >>> 0 ? 1 : 0)),
              (B = _.low = B + pr),
              (_.high = E + ti + (B >>> 0 < pr >>> 0 ? 1 : 0)),
              (I = b.low = I + hr),
              (b.high = U + _n + (I >>> 0 < hr >>> 0 ? 1 : 0)))
          },
          _doFinalize: function () {
            var p = this._data,
              h = p.words,
              f = this._nDataBytes * 8,
              g = p.sigBytes * 8
            ;((h[g >>> 5] |= 128 << (24 - (g % 32))),
              (h[(((g + 128) >>> 10) << 5) + 30] = Math.floor(f / 4294967296)),
              (h[(((g + 128) >>> 10) << 5) + 31] = f),
              (p.sigBytes = h.length * 4),
              this._process())
            var w = this._hash.toX32()
            return w
          },
          clone: function () {
            var p = r.clone.call(this)
            return ((p._hash = this._hash.clone()), p)
          },
          blockSize: 1024 / 32,
        }))
        ;((e.SHA512 = r._createHelper(u)),
          (e.HmacSHA512 = r._createHmacHelper(u)))
      })(),
      i.SHA512
    )
  })
})
var Vd = W((Qi, Gd) => {
  ;(function (i, e, t) {
    typeof Qi == "object"
      ? (Gd.exports = Qi = e(K(), Br(), ao()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./x64-core", "./sha512"], e)
        : e(i.CryptoJS)
  })(Qi, function (i) {
    return (
      (function () {
        var e = i,
          t = e.x64,
          r = t.Word,
          s = t.WordArray,
          n = e.algo,
          o = n.SHA512,
          a = (n.SHA384 = o.extend({
            _doReset: function () {
              this._hash = new s.init([
                new r.init(3418070365, 3238371032),
                new r.init(1654270250, 914150663),
                new r.init(2438529370, 812702999),
                new r.init(355462360, 4144912697),
                new r.init(1731405415, 4290775857),
                new r.init(2394180231, 1750603025),
                new r.init(3675008525, 1694076839),
                new r.init(1203062813, 3204075428),
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
      i.SHA384
    )
  })
})
var Qd = W((Xi, Jd) => {
  ;(function (i, e, t) {
    typeof Xi == "object"
      ? (Jd.exports = Xi = e(K(), Br()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./x64-core"], e)
        : e(i.CryptoJS)
  })(Xi, function (i) {
    return (
      (function (e) {
        var t = i,
          r = t.lib,
          s = r.WordArray,
          n = r.Hasher,
          o = t.x64,
          a = o.Word,
          c = t.algo,
          d = [],
          l = [],
          u = []
        ;(function () {
          for (var f = 1, g = 0, w = 0; w < 24; w++) {
            d[f + 5 * g] = (((w + 1) * (w + 2)) / 2) % 64
            var m = g % 5,
              y = (2 * f + 3 * g) % 5
            ;((f = m), (g = y))
          }
          for (var f = 0; f < 5; f++)
            for (var g = 0; g < 5; g++)
              l[f + 5 * g] = g + ((2 * f + 3 * g) % 5) * 5
          for (var v = 1, x = 0; x < 24; x++) {
            for (var _ = 0, b = 0, P = 0; P < 7; P++) {
              if (v & 1) {
                var A = (1 << P) - 1
                A < 32 ? (b ^= 1 << A) : (_ ^= 1 << (A - 32))
              }
              v & 128 ? (v = (v << 1) ^ 113) : (v <<= 1)
            }
            u[x] = a.create(_, b)
          }
        })()
        var p = []
        ;(function () {
          for (var f = 0; f < 25; f++) p[f] = a.create()
        })()
        var h = (c.SHA3 = n.extend({
          cfg: n.cfg.extend({ outputLength: 512 }),
          _doReset: function () {
            for (var f = (this._state = []), g = 0; g < 25; g++)
              f[g] = new a.init()
            this.blockSize = (1600 - 2 * this.cfg.outputLength) / 32
          },
          _doProcessBlock: function (f, g) {
            for (
              var w = this._state, m = this.blockSize / 2, y = 0;
              y < m;
              y++
            ) {
              var v = f[g + 2 * y],
                x = f[g + 2 * y + 1]
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
              for (var P = 0; P < 5; P++) {
                for (var A = 0, C = 0, S = 0; S < 5; S++) {
                  var _ = w[P + 5 * S]
                  ;((A ^= _.high), (C ^= _.low))
                }
                var k = p[P]
                ;((k.high = A), (k.low = C))
              }
              for (var P = 0; P < 5; P++)
                for (
                  var D = p[(P + 4) % 5],
                    F = p[(P + 1) % 5],
                    T = F.high,
                    O = F.low,
                    A = D.high ^ ((T << 1) | (O >>> 31)),
                    C = D.low ^ ((O << 1) | (T >>> 31)),
                    S = 0;
                  S < 5;
                  S++
                ) {
                  var _ = w[P + 5 * S]
                  ;((_.high ^= A), (_.low ^= C))
                }
              for (var q = 1; q < 25; q++) {
                var A,
                  C,
                  _ = w[q],
                  L = _.high,
                  G = _.low,
                  E = d[q]
                E < 32
                  ? ((A = (L << E) | (G >>> (32 - E))),
                    (C = (G << E) | (L >>> (32 - E))))
                  : ((A = (G << (E - 32)) | (L >>> (64 - E))),
                    (C = (L << (E - 32)) | (G >>> (64 - E))))
                var B = p[l[q]]
                ;((B.high = A), (B.low = C))
              }
              var U = p[0],
                I = w[0]
              ;((U.high = I.high), (U.low = I.low))
              for (var P = 0; P < 5; P++)
                for (var S = 0; S < 5; S++) {
                  var q = P + 5 * S,
                    _ = w[q],
                    Y = p[q],
                    V = p[((P + 1) % 5) + 5 * S],
                    be = p[((P + 2) % 5) + 5 * S]
                  ;((_.high = Y.high ^ (~V.high & be.high)),
                    (_.low = Y.low ^ (~V.low & be.low)))
                }
              var _ = w[0],
                H = u[b]
              ;((_.high ^= H.high), (_.low ^= H.low))
            }
          },
          _doFinalize: function () {
            var f = this._data,
              g = f.words,
              w = this._nDataBytes * 8,
              m = f.sigBytes * 8,
              y = this.blockSize * 32
            ;((g[m >>> 5] |= 1 << (24 - (m % 32))),
              (g[((e.ceil((m + 1) / y) * y) >>> 5) - 1] |= 128),
              (f.sigBytes = g.length * 4),
              this._process())
            for (
              var v = this._state,
                x = this.cfg.outputLength / 8,
                _ = x / 8,
                b = [],
                P = 0;
              P < _;
              P++
            ) {
              var A = v[P],
                C = A.high,
                S = A.low
              ;((C =
                (((C << 8) | (C >>> 24)) & 16711935) |
                (((C << 24) | (C >>> 8)) & 4278255360)),
                (S =
                  (((S << 8) | (S >>> 24)) & 16711935) |
                  (((S << 24) | (S >>> 8)) & 4278255360)),
                b.push(S),
                b.push(C))
            }
            return new s.init(b, x)
          },
          clone: function () {
            for (
              var f = n.clone.call(this),
                g = (f._state = this._state.slice(0)),
                w = 0;
              w < 25;
              w++
            )
              g[w] = g[w].clone()
            return f
          },
        }))
        ;((t.SHA3 = n._createHelper(h)), (t.HmacSHA3 = n._createHmacHelper(h)))
      })(Math),
      i.SHA3
    )
  })
})
var Yd = W((Yi, Xd) => {
  ;(function (i, e) {
    typeof Yi == "object"
      ? (Xd.exports = Yi = e(K()))
      : typeof define == "function" && define.amd
        ? define(["./core"], e)
        : e(i.CryptoJS)
  })(Yi, function (i) {
    return (
      (function (e) {
        var t = i,
          r = t.lib,
          s = r.WordArray,
          n = r.Hasher,
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
          p = s.create([1352829926, 1548603684, 1836072691, 2053994217, 0]),
          h = (o.RIPEMD160 = n.extend({
            _doReset: function () {
              this._hash = s.create([
                1732584193, 4023233417, 2562383102, 271733878, 3285377520,
              ])
            },
            _doProcessBlock: function (x, _) {
              for (var b = 0; b < 16; b++) {
                var P = _ + b,
                  A = x[P]
                x[P] =
                  (((A << 8) | (A >>> 24)) & 16711935) |
                  (((A << 24) | (A >>> 8)) & 4278255360)
              }
              var C = this._hash.words,
                S = u.words,
                k = p.words,
                D = a.words,
                F = c.words,
                T = d.words,
                O = l.words,
                q,
                L,
                G,
                E,
                B,
                U,
                I,
                Y,
                V,
                be
              ;((U = q = C[0]),
                (I = L = C[1]),
                (Y = G = C[2]),
                (V = E = C[3]),
                (be = B = C[4]))
              for (var H, b = 0; b < 80; b += 1)
                ((H = (q + x[_ + D[b]]) | 0),
                  b < 16
                    ? (H += f(L, G, E) + S[0])
                    : b < 32
                      ? (H += g(L, G, E) + S[1])
                      : b < 48
                        ? (H += w(L, G, E) + S[2])
                        : b < 64
                          ? (H += m(L, G, E) + S[3])
                          : (H += y(L, G, E) + S[4]),
                  (H = H | 0),
                  (H = v(H, T[b])),
                  (H = (H + B) | 0),
                  (q = B),
                  (B = E),
                  (E = v(G, 10)),
                  (G = L),
                  (L = H),
                  (H = (U + x[_ + F[b]]) | 0),
                  b < 16
                    ? (H += y(I, Y, V) + k[0])
                    : b < 32
                      ? (H += m(I, Y, V) + k[1])
                      : b < 48
                        ? (H += w(I, Y, V) + k[2])
                        : b < 64
                          ? (H += g(I, Y, V) + k[3])
                          : (H += f(I, Y, V) + k[4]),
                  (H = H | 0),
                  (H = v(H, O[b])),
                  (H = (H + be) | 0),
                  (U = be),
                  (be = V),
                  (V = v(Y, 10)),
                  (Y = I),
                  (I = H))
              ;((H = (C[1] + G + V) | 0),
                (C[1] = (C[2] + E + be) | 0),
                (C[2] = (C[3] + B + U) | 0),
                (C[3] = (C[4] + q + I) | 0),
                (C[4] = (C[0] + L + Y) | 0),
                (C[0] = H))
            },
            _doFinalize: function () {
              var x = this._data,
                _ = x.words,
                b = this._nDataBytes * 8,
                P = x.sigBytes * 8
              ;((_[P >>> 5] |= 128 << (24 - (P % 32))),
                (_[(((P + 64) >>> 9) << 4) + 14] =
                  (((b << 8) | (b >>> 24)) & 16711935) |
                  (((b << 24) | (b >>> 8)) & 4278255360)),
                (x.sigBytes = (_.length + 1) * 4),
                this._process())
              for (var A = this._hash, C = A.words, S = 0; S < 5; S++) {
                var k = C[S]
                C[S] =
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
        function f(x, _, b) {
          return x ^ _ ^ b
        }
        function g(x, _, b) {
          return (x & _) | (~x & b)
        }
        function w(x, _, b) {
          return (x | ~_) ^ b
        }
        function m(x, _, b) {
          return (x & b) | (_ & ~b)
        }
        function y(x, _, b) {
          return x ^ (_ | ~b)
        }
        function v(x, _) {
          return (x << _) | (x >>> (32 - _))
        }
        ;((t.RIPEMD160 = n._createHelper(h)),
          (t.HmacRIPEMD160 = n._createHmacHelper(h)))
      })(Math),
      i.RIPEMD160
    )
  })
})
var es = W((Zi, Zd) => {
  ;(function (i, e) {
    typeof Zi == "object"
      ? (Zd.exports = Zi = e(K()))
      : typeof define == "function" && define.amd
        ? define(["./core"], e)
        : e(i.CryptoJS)
  })(Zi, function (i) {
    ;(function () {
      var e = i,
        t = e.lib,
        r = t.Base,
        s = e.enc,
        n = s.Utf8,
        o = e.algo,
        a = (o.HMAC = r.extend({
          init: function (c, d) {
            ;((c = this._hasher = new c.init()),
              typeof d == "string" && (d = n.parse(d)))
            var l = c.blockSize,
              u = l * 4
            ;(d.sigBytes > u && (d = c.finalize(d)), d.clamp())
            for (
              var p = (this._oKey = d.clone()),
                h = (this._iKey = d.clone()),
                f = p.words,
                g = h.words,
                w = 0;
              w < l;
              w++
            )
              ((f[w] ^= 1549556828), (g[w] ^= 909522486))
            ;((p.sigBytes = h.sigBytes = u), this.reset())
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
var tl = W((ts, el) => {
  ;(function (i, e, t) {
    typeof ts == "object"
      ? (el.exports = ts = e(K(), Gi(), es()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./sha256", "./hmac"], e)
        : e(i.CryptoJS)
  })(ts, function (i) {
    return (
      (function () {
        var e = i,
          t = e.lib,
          r = t.Base,
          s = t.WordArray,
          n = e.algo,
          o = n.SHA256,
          a = n.HMAC,
          c = (n.PBKDF2 = r.extend({
            cfg: r.extend({ keySize: 128 / 32, hasher: o, iterations: 25e4 }),
            init: function (d) {
              this.cfg = this.cfg.extend(d)
            },
            compute: function (d, l) {
              for (
                var u = this.cfg,
                  p = a.create(u.hasher, d),
                  h = s.create(),
                  f = s.create([1]),
                  g = h.words,
                  w = f.words,
                  m = u.keySize,
                  y = u.iterations;
                g.length < m;
              ) {
                var v = p.update(l).finalize(f)
                p.reset()
                for (var x = v.words, _ = x.length, b = v, P = 1; P < y; P++) {
                  ;((b = p.finalize(b)), p.reset())
                  for (var A = b.words, C = 0; C < _; C++) x[C] ^= A[C]
                }
                ;(h.concat(v), w[0]++)
              }
              return ((h.sigBytes = m * 4), h)
            },
          }))
        e.PBKDF2 = function (d, l, u) {
          return c.create(u).compute(d, l)
        }
      })(),
      i.PBKDF2
    )
  })
})
var tt = W((rs, rl) => {
  ;(function (i, e, t) {
    typeof rs == "object"
      ? (rl.exports = rs = e(K(), oo(), es()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./sha1", "./hmac"], e)
        : e(i.CryptoJS)
  })(rs, function (i) {
    return (
      (function () {
        var e = i,
          t = e.lib,
          r = t.Base,
          s = t.WordArray,
          n = e.algo,
          o = n.MD5,
          a = (n.EvpKDF = r.extend({
            cfg: r.extend({ keySize: 128 / 32, hasher: o, iterations: 1 }),
            init: function (c) {
              this.cfg = this.cfg.extend(c)
            },
            compute: function (c, d) {
              for (
                var l,
                  u = this.cfg,
                  p = u.hasher.create(),
                  h = s.create(),
                  f = h.words,
                  g = u.keySize,
                  w = u.iterations;
                f.length < g;
              ) {
                ;(l && p.update(l), (l = p.update(c).finalize(d)), p.reset())
                for (var m = 1; m < w; m++) ((l = p.finalize(l)), p.reset())
                h.concat(l)
              }
              return ((h.sigBytes = g * 4), h)
            },
          }))
        e.EvpKDF = function (c, d, l) {
          return a.create(l).compute(c, d)
        }
      })(),
      i.EvpKDF
    )
  })
})
var pe = W((is, il) => {
  ;(function (i, e, t) {
    typeof is == "object"
      ? (il.exports = is = e(K(), tt()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./evpkdf"], e)
        : e(i.CryptoJS)
  })(is, function (i) {
    i.lib.Cipher ||
      (function (e) {
        var t = i,
          r = t.lib,
          s = r.Base,
          n = r.WordArray,
          o = r.BufferedBlockAlgorithm,
          a = t.enc,
          c = a.Utf8,
          d = a.Base64,
          l = t.algo,
          u = l.EvpKDF,
          p = (r.Cipher = o.extend({
            cfg: s.extend(),
            createEncryptor: function (k, D) {
              return this.create(this._ENC_XFORM_MODE, k, D)
            },
            createDecryptor: function (k, D) {
              return this.create(this._DEC_XFORM_MODE, k, D)
            },
            init: function (k, D, F) {
              ;((this.cfg = this.cfg.extend(F)),
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
                return typeof D == "string" ? S : P
              }
              return function (D) {
                return {
                  encrypt: function (F, T, O) {
                    return k(T).encrypt(D, F, T, O)
                  },
                  decrypt: function (F, T, O) {
                    return k(T).decrypt(D, F, T, O)
                  },
                }
              }
            })(),
          })),
          h = (r.StreamCipher = p.extend({
            _doFinalize: function () {
              var k = this._process(!0)
              return k
            },
            blockSize: 1,
          })),
          f = (t.mode = {}),
          g = (r.BlockCipherMode = s.extend({
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
          w = (f.CBC = (function () {
            var k = g.extend()
            ;((k.Encryptor = k.extend({
              processBlock: function (F, T) {
                var O = this._cipher,
                  q = O.blockSize
                ;(D.call(this, F, T, q),
                  O.encryptBlock(F, T),
                  (this._prevBlock = F.slice(T, T + q)))
              },
            })),
              (k.Decryptor = k.extend({
                processBlock: function (F, T) {
                  var O = this._cipher,
                    q = O.blockSize,
                    L = F.slice(T, T + q)
                  ;(O.decryptBlock(F, T),
                    D.call(this, F, T, q),
                    (this._prevBlock = L))
                },
              })))
            function D(F, T, O) {
              var q,
                L = this._iv
              L ? ((q = L), (this._iv = e)) : (q = this._prevBlock)
              for (var G = 0; G < O; G++) F[T + G] ^= q[G]
            }
            return k
          })()),
          m = (t.pad = {}),
          y = (m.Pkcs7 = {
            pad: function (k, D) {
              for (
                var F = D * 4,
                  T = F - (k.sigBytes % F),
                  O = (T << 24) | (T << 16) | (T << 8) | T,
                  q = [],
                  L = 0;
                L < T;
                L += 4
              )
                q.push(O)
              var G = n.create(q, T)
              k.concat(G)
            },
            unpad: function (k) {
              var D = k.words[(k.sigBytes - 1) >>> 2] & 255
              k.sigBytes -= D
            },
          }),
          v = (r.BlockCipher = p.extend({
            cfg: p.cfg.extend({ mode: w, padding: y }),
            reset: function () {
              var k
              p.reset.call(this)
              var D = this.cfg,
                F = D.iv,
                T = D.mode
              ;(this._xformMode == this._ENC_XFORM_MODE
                ? (k = T.createEncryptor)
                : ((k = T.createDecryptor), (this._minBufferSize = 1)),
                this._mode && this._mode.__creator == k
                  ? this._mode.init(this, F && F.words)
                  : ((this._mode = k.call(T, this, F && F.words)),
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
          x = (r.CipherParams = s.extend({
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
                F = k.ciphertext,
                T = k.salt
              return (
                T
                  ? (D = n.create([1398893684, 1701076831]).concat(T).concat(F))
                  : (D = F),
                D.toString(d)
              )
            },
            parse: function (k) {
              var D,
                F = d.parse(k),
                T = F.words
              return (
                T[0] == 1398893684 &&
                  T[1] == 1701076831 &&
                  ((D = n.create(T.slice(2, 4))),
                  T.splice(0, 4),
                  (F.sigBytes -= 16)),
                x.create({ ciphertext: F, salt: D })
              )
            },
          }),
          P = (r.SerializableCipher = s.extend({
            cfg: s.extend({ format: b }),
            encrypt: function (k, D, F, T) {
              T = this.cfg.extend(T)
              var O = k.createEncryptor(F, T),
                q = O.finalize(D),
                L = O.cfg
              return x.create({
                ciphertext: q,
                key: F,
                iv: L.iv,
                algorithm: k,
                mode: L.mode,
                padding: L.padding,
                blockSize: k.blockSize,
                formatter: T.format,
              })
            },
            decrypt: function (k, D, F, T) {
              ;((T = this.cfg.extend(T)), (D = this._parse(D, T.format)))
              var O = k.createDecryptor(F, T).finalize(D.ciphertext)
              return O
            },
            _parse: function (k, D) {
              return typeof k == "string" ? D.parse(k, this) : k
            },
          })),
          A = (t.kdf = {}),
          C = (A.OpenSSL = {
            execute: function (k, D, F, T, O) {
              if ((T || (T = n.random(64 / 8)), O))
                var q = u.create({ keySize: D + F, hasher: O }).compute(k, T)
              else var q = u.create({ keySize: D + F }).compute(k, T)
              var L = n.create(q.words.slice(D), F * 4)
              return (
                (q.sigBytes = D * 4),
                x.create({ key: q, iv: L, salt: T })
              )
            },
          }),
          S = (r.PasswordBasedCipher = P.extend({
            cfg: P.cfg.extend({ kdf: C }),
            encrypt: function (k, D, F, T) {
              T = this.cfg.extend(T)
              var O = T.kdf.execute(F, k.keySize, k.ivSize, T.salt, T.hasher)
              T.iv = O.iv
              var q = P.encrypt.call(this, k, D, O.key, T)
              return (q.mixIn(O), q)
            },
            decrypt: function (k, D, F, T) {
              ;((T = this.cfg.extend(T)), (D = this._parse(D, T.format)))
              var O = T.kdf.execute(F, k.keySize, k.ivSize, D.salt, T.hasher)
              T.iv = O.iv
              var q = P.decrypt.call(this, k, D, O.key, T)
              return q
            },
          }))
      })()
  })
})
var nl = W((ss, sl) => {
  ;(function (i, e, t) {
    typeof ss == "object"
      ? (sl.exports = ss = e(K(), pe()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./cipher-core"], e)
        : e(i.CryptoJS)
  })(ss, function (i) {
    return (
      (i.mode.CFB = (function () {
        var e = i.lib.BlockCipherMode.extend()
        ;((e.Encryptor = e.extend({
          processBlock: function (r, s) {
            var n = this._cipher,
              o = n.blockSize
            ;(t.call(this, r, s, o, n), (this._prevBlock = r.slice(s, s + o)))
          },
        })),
          (e.Decryptor = e.extend({
            processBlock: function (r, s) {
              var n = this._cipher,
                o = n.blockSize,
                a = r.slice(s, s + o)
              ;(t.call(this, r, s, o, n), (this._prevBlock = a))
            },
          })))
        function t(r, s, n, o) {
          var a,
            c = this._iv
          ;(c ? ((a = c.slice(0)), (this._iv = void 0)) : (a = this._prevBlock),
            o.encryptBlock(a, 0))
          for (var d = 0; d < n; d++) r[s + d] ^= a[d]
        }
        return e
      })()),
      i.mode.CFB
    )
  })
})
var al = W((ns, ol) => {
  ;(function (i, e, t) {
    typeof ns == "object"
      ? (ol.exports = ns = e(K(), pe()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./cipher-core"], e)
        : e(i.CryptoJS)
  })(ns, function (i) {
    return (
      (i.mode.CTR = (function () {
        var e = i.lib.BlockCipherMode.extend(),
          t = (e.Encryptor = e.extend({
            processBlock: function (r, s) {
              var n = this._cipher,
                o = n.blockSize,
                a = this._iv,
                c = this._counter
              a && ((c = this._counter = a.slice(0)), (this._iv = void 0))
              var d = c.slice(0)
              ;(n.encryptBlock(d, 0), (c[o - 1] = (c[o - 1] + 1) | 0))
              for (var l = 0; l < o; l++) r[s + l] ^= d[l]
            },
          }))
        return ((e.Decryptor = t), e)
      })()),
      i.mode.CTR
    )
  })
})
var dl = W((os, cl) => {
  ;(function (i, e, t) {
    typeof os == "object"
      ? (cl.exports = os = e(K(), pe()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./cipher-core"], e)
        : e(i.CryptoJS)
  })(os, function (i) {
    return (
      (i.mode.CTRGladman = (function () {
        var e = i.lib.BlockCipherMode.extend()
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
        function r(n) {
          return ((n[0] = t(n[0])) === 0 && (n[1] = t(n[1])), n)
        }
        var s = (e.Encryptor = e.extend({
          processBlock: function (n, o) {
            var a = this._cipher,
              c = a.blockSize,
              d = this._iv,
              l = this._counter
            ;(d && ((l = this._counter = d.slice(0)), (this._iv = void 0)),
              r(l))
            var u = l.slice(0)
            a.encryptBlock(u, 0)
            for (var p = 0; p < c; p++) n[o + p] ^= u[p]
          },
        }))
        return ((e.Decryptor = s), e)
      })()),
      i.mode.CTRGladman
    )
  })
})
var ul = W((as, ll) => {
  ;(function (i, e, t) {
    typeof as == "object"
      ? (ll.exports = as = e(K(), pe()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./cipher-core"], e)
        : e(i.CryptoJS)
  })(as, function (i) {
    return (
      (i.mode.OFB = (function () {
        var e = i.lib.BlockCipherMode.extend(),
          t = (e.Encryptor = e.extend({
            processBlock: function (r, s) {
              var n = this._cipher,
                o = n.blockSize,
                a = this._iv,
                c = this._keystream
              ;(a && ((c = this._keystream = a.slice(0)), (this._iv = void 0)),
                n.encryptBlock(c, 0))
              for (var d = 0; d < o; d++) r[s + d] ^= c[d]
            },
          }))
        return ((e.Decryptor = t), e)
      })()),
      i.mode.OFB
    )
  })
})
var hl = W((cs, pl) => {
  ;(function (i, e, t) {
    typeof cs == "object"
      ? (pl.exports = cs = e(K(), pe()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./cipher-core"], e)
        : e(i.CryptoJS)
  })(cs, function (i) {
    return (
      (i.mode.ECB = (function () {
        var e = i.lib.BlockCipherMode.extend()
        return (
          (e.Encryptor = e.extend({
            processBlock: function (t, r) {
              this._cipher.encryptBlock(t, r)
            },
          })),
          (e.Decryptor = e.extend({
            processBlock: function (t, r) {
              this._cipher.decryptBlock(t, r)
            },
          })),
          e
        )
      })()),
      i.mode.ECB
    )
  })
})
var ml = W((ds, fl) => {
  ;(function (i, e, t) {
    typeof ds == "object"
      ? (fl.exports = ds = e(K(), pe()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./cipher-core"], e)
        : e(i.CryptoJS)
  })(ds, function (i) {
    return (
      (i.pad.AnsiX923 = {
        pad: function (e, t) {
          var r = e.sigBytes,
            s = t * 4,
            n = s - (r % s),
            o = r + n - 1
          ;(e.clamp(),
            (e.words[o >>> 2] |= n << (24 - (o % 4) * 8)),
            (e.sigBytes += n))
        },
        unpad: function (e) {
          var t = e.words[(e.sigBytes - 1) >>> 2] & 255
          e.sigBytes -= t
        },
      }),
      i.pad.Ansix923
    )
  })
})
var yl = W((ls, gl) => {
  ;(function (i, e, t) {
    typeof ls == "object"
      ? (gl.exports = ls = e(K(), pe()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./cipher-core"], e)
        : e(i.CryptoJS)
  })(ls, function (i) {
    return (
      (i.pad.Iso10126 = {
        pad: function (e, t) {
          var r = t * 4,
            s = r - (e.sigBytes % r)
          e.concat(i.lib.WordArray.random(s - 1)).concat(
            i.lib.WordArray.create([s << 24], 1),
          )
        },
        unpad: function (e) {
          var t = e.words[(e.sigBytes - 1) >>> 2] & 255
          e.sigBytes -= t
        },
      }),
      i.pad.Iso10126
    )
  })
})
var xl = W((us, wl) => {
  ;(function (i, e, t) {
    typeof us == "object"
      ? (wl.exports = us = e(K(), pe()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./cipher-core"], e)
        : e(i.CryptoJS)
  })(us, function (i) {
    return (
      (i.pad.Iso97971 = {
        pad: function (e, t) {
          ;(e.concat(i.lib.WordArray.create([2147483648], 1)),
            i.pad.ZeroPadding.pad(e, t))
        },
        unpad: function (e) {
          ;(i.pad.ZeroPadding.unpad(e), e.sigBytes--)
        },
      }),
      i.pad.Iso97971
    )
  })
})
var vl = W((ps, _l) => {
  ;(function (i, e, t) {
    typeof ps == "object"
      ? (_l.exports = ps = e(K(), pe()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./cipher-core"], e)
        : e(i.CryptoJS)
  })(ps, function (i) {
    return (
      (i.pad.ZeroPadding = {
        pad: function (e, t) {
          var r = t * 4
          ;(e.clamp(), (e.sigBytes += r - (e.sigBytes % r || r)))
        },
        unpad: function (e) {
          for (
            var t = e.words, r = e.sigBytes - 1, r = e.sigBytes - 1;
            r >= 0;
            r--
          )
            if ((t[r >>> 2] >>> (24 - (r % 4) * 8)) & 255) {
              e.sigBytes = r + 1
              break
            }
        },
      }),
      i.pad.ZeroPadding
    )
  })
})
var kl = W((hs, bl) => {
  ;(function (i, e, t) {
    typeof hs == "object"
      ? (bl.exports = hs = e(K(), pe()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./cipher-core"], e)
        : e(i.CryptoJS)
  })(hs, function (i) {
    return (
      (i.pad.NoPadding = { pad: function () {}, unpad: function () {} }),
      i.pad.NoPadding
    )
  })
})
var Sl = W((fs, Pl) => {
  ;(function (i, e, t) {
    typeof fs == "object"
      ? (Pl.exports = fs = e(K(), pe()))
      : typeof define == "function" && define.amd
        ? define(["./core", "./cipher-core"], e)
        : e(i.CryptoJS)
  })(fs, function (i) {
    return (
      (function (e) {
        var t = i,
          r = t.lib,
          s = r.CipherParams,
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
      i.format.Hex
    )
  })
})
var Cl = W((ms, Al) => {
  ;(function (i, e, t) {
    typeof ms == "object"
      ? (Al.exports = ms = e(K(), wt(), xt(), tt(), pe()))
      : typeof define == "function" && define.amd
        ? define(
            ["./core", "./enc-base64", "./md5", "./evpkdf", "./cipher-core"],
            e,
          )
        : e(i.CryptoJS)
  })(ms, function (i) {
    return (
      (function () {
        var e = i,
          t = e.lib,
          r = t.BlockCipher,
          s = e.algo,
          n = [],
          o = [],
          a = [],
          c = [],
          d = [],
          l = [],
          u = [],
          p = [],
          h = [],
          f = []
        ;(function () {
          for (var m = [], y = 0; y < 256; y++)
            y < 128 ? (m[y] = y << 1) : (m[y] = (y << 1) ^ 283)
          for (var v = 0, x = 0, y = 0; y < 256; y++) {
            var _ = x ^ (x << 1) ^ (x << 2) ^ (x << 3) ^ (x << 4)
            ;((_ = (_ >>> 8) ^ (_ & 255) ^ 99), (n[v] = _), (o[_] = v))
            var b = m[v],
              P = m[b],
              A = m[P],
              C = (m[_] * 257) ^ (_ * 16843008)
            ;((a[v] = (C << 24) | (C >>> 8)),
              (c[v] = (C << 16) | (C >>> 16)),
              (d[v] = (C << 8) | (C >>> 24)),
              (l[v] = C))
            var C = (A * 16843009) ^ (P * 65537) ^ (b * 257) ^ (v * 16843008)
            ;((u[_] = (C << 24) | (C >>> 8)),
              (p[_] = (C << 16) | (C >>> 16)),
              (h[_] = (C << 8) | (C >>> 24)),
              (f[_] = C),
              v ? ((v = b ^ m[m[m[A ^ b]]]), (x ^= m[m[x]])) : (v = x = 1))
          }
        })()
        var g = [0, 1, 2, 4, 8, 16, 32, 64, 128, 27, 54],
          w = (s.AES = r.extend({
            _doReset: function () {
              var m
              if (!(this._nRounds && this._keyPriorReset === this._key)) {
                for (
                  var y = (this._keyPriorReset = this._key),
                    v = y.words,
                    x = y.sigBytes / 4,
                    _ = (this._nRounds = x + 6),
                    b = (_ + 1) * 4,
                    P = (this._keySchedule = []),
                    A = 0;
                  A < b;
                  A++
                )
                  A < x
                    ? (P[A] = v[A])
                    : ((m = P[A - 1]),
                      A % x
                        ? x > 6 &&
                          A % x == 4 &&
                          (m =
                            (n[m >>> 24] << 24) |
                            (n[(m >>> 16) & 255] << 16) |
                            (n[(m >>> 8) & 255] << 8) |
                            n[m & 255])
                        : ((m = (m << 8) | (m >>> 24)),
                          (m =
                            (n[m >>> 24] << 24) |
                            (n[(m >>> 16) & 255] << 16) |
                            (n[(m >>> 8) & 255] << 8) |
                            n[m & 255]),
                          (m ^= g[(A / x) | 0] << 24)),
                      (P[A] = P[A - x] ^ m))
                for (var C = (this._invKeySchedule = []), S = 0; S < b; S++) {
                  var A = b - S
                  if (S % 4) var m = P[A]
                  else var m = P[A - 4]
                  S < 4 || A <= 4
                    ? (C[S] = m)
                    : (C[S] =
                        u[n[m >>> 24]] ^
                        p[n[(m >>> 16) & 255]] ^
                        h[n[(m >>> 8) & 255]] ^
                        f[n[m & 255]])
                }
              }
            },
            encryptBlock: function (m, y) {
              this._doCryptBlock(m, y, this._keySchedule, a, c, d, l, n)
            },
            decryptBlock: function (m, y) {
              var v = m[y + 1]
              ;((m[y + 1] = m[y + 3]),
                (m[y + 3] = v),
                this._doCryptBlock(m, y, this._invKeySchedule, u, p, h, f, o))
              var v = m[y + 1]
              ;((m[y + 1] = m[y + 3]), (m[y + 3] = v))
            },
            _doCryptBlock: function (m, y, v, x, _, b, P, A) {
              for (
                var C = this._nRounds,
                  S = m[y] ^ v[0],
                  k = m[y + 1] ^ v[1],
                  D = m[y + 2] ^ v[2],
                  F = m[y + 3] ^ v[3],
                  T = 4,
                  O = 1;
                O < C;
                O++
              ) {
                var q =
                    x[S >>> 24] ^
                    _[(k >>> 16) & 255] ^
                    b[(D >>> 8) & 255] ^
                    P[F & 255] ^
                    v[T++],
                  L =
                    x[k >>> 24] ^
                    _[(D >>> 16) & 255] ^
                    b[(F >>> 8) & 255] ^
                    P[S & 255] ^
                    v[T++],
                  G =
                    x[D >>> 24] ^
                    _[(F >>> 16) & 255] ^
                    b[(S >>> 8) & 255] ^
                    P[k & 255] ^
                    v[T++],
                  E =
                    x[F >>> 24] ^
                    _[(S >>> 16) & 255] ^
                    b[(k >>> 8) & 255] ^
                    P[D & 255] ^
                    v[T++]
                ;((S = q), (k = L), (D = G), (F = E))
              }
              var q =
                  ((A[S >>> 24] << 24) |
                    (A[(k >>> 16) & 255] << 16) |
                    (A[(D >>> 8) & 255] << 8) |
                    A[F & 255]) ^
                  v[T++],
                L =
                  ((A[k >>> 24] << 24) |
                    (A[(D >>> 16) & 255] << 16) |
                    (A[(F >>> 8) & 255] << 8) |
                    A[S & 255]) ^
                  v[T++],
                G =
                  ((A[D >>> 24] << 24) |
                    (A[(F >>> 16) & 255] << 16) |
                    (A[(S >>> 8) & 255] << 8) |
                    A[k & 255]) ^
                  v[T++],
                E =
                  ((A[F >>> 24] << 24) |
                    (A[(S >>> 16) & 255] << 16) |
                    (A[(k >>> 8) & 255] << 8) |
                    A[D & 255]) ^
                  v[T++]
              ;((m[y] = q), (m[y + 1] = L), (m[y + 2] = G), (m[y + 3] = E))
            },
            keySize: 256 / 32,
          }))
        e.AES = r._createHelper(w)
      })(),
      i.AES
    )
  })
})
var Dl = W((gs, Tl) => {
  ;(function (i, e, t) {
    typeof gs == "object"
      ? (Tl.exports = gs = e(K(), wt(), xt(), tt(), pe()))
      : typeof define == "function" && define.amd
        ? define(
            ["./core", "./enc-base64", "./md5", "./evpkdf", "./cipher-core"],
            e,
          )
        : e(i.CryptoJS)
  })(gs, function (i) {
    return (
      (function () {
        var e = i,
          t = e.lib,
          r = t.WordArray,
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
              for (var g = this._key, w = g.words, m = [], y = 0; y < 56; y++) {
                var v = o[y] - 1
                m[y] = (w[v >>> 5] >>> (31 - (v % 32))) & 1
              }
              for (var x = (this._subKeys = []), _ = 0; _ < 16; _++) {
                for (var b = (x[_] = []), P = c[_], y = 0; y < 24; y++)
                  ((b[(y / 6) | 0] |= m[(a[y] - 1 + P) % 28] << (31 - (y % 6))),
                    (b[4 + ((y / 6) | 0)] |=
                      m[28 + ((a[y + 24] - 1 + P) % 28)] << (31 - (y % 6))))
                b[0] = (b[0] << 1) | (b[0] >>> 31)
                for (var y = 1; y < 7; y++) b[y] = b[y] >>> ((y - 1) * 4 + 3)
                b[7] = (b[7] << 5) | (b[7] >>> 27)
              }
              for (var A = (this._invSubKeys = []), y = 0; y < 16; y++)
                A[y] = x[15 - y]
            },
            encryptBlock: function (g, w) {
              this._doCryptBlock(g, w, this._subKeys)
            },
            decryptBlock: function (g, w) {
              this._doCryptBlock(g, w, this._invSubKeys)
            },
            _doCryptBlock: function (g, w, m) {
              ;((this._lBlock = g[w]),
                (this._rBlock = g[w + 1]),
                p.call(this, 4, 252645135),
                p.call(this, 16, 65535),
                h.call(this, 2, 858993459),
                h.call(this, 8, 16711935),
                p.call(this, 1, 1431655765))
              for (var y = 0; y < 16; y++) {
                for (
                  var v = m[y],
                    x = this._lBlock,
                    _ = this._rBlock,
                    b = 0,
                    P = 0;
                  P < 8;
                  P++
                )
                  b |= d[P][((_ ^ v[P]) & l[P]) >>> 0]
                ;((this._lBlock = _), (this._rBlock = x ^ b))
              }
              var A = this._lBlock
              ;((this._lBlock = this._rBlock),
                (this._rBlock = A),
                p.call(this, 1, 1431655765),
                h.call(this, 8, 16711935),
                h.call(this, 2, 858993459),
                p.call(this, 16, 65535),
                p.call(this, 4, 252645135),
                (g[w] = this._lBlock),
                (g[w + 1] = this._rBlock))
            },
            keySize: 64 / 32,
            ivSize: 64 / 32,
            blockSize: 64 / 32,
          }))
        function p(g, w) {
          var m = ((this._lBlock >>> g) ^ this._rBlock) & w
          ;((this._rBlock ^= m), (this._lBlock ^= m << g))
        }
        function h(g, w) {
          var m = ((this._rBlock >>> g) ^ this._lBlock) & w
          ;((this._lBlock ^= m), (this._rBlock ^= m << g))
        }
        e.DES = s._createHelper(u)
        var f = (n.TripleDES = s.extend({
          _doReset: function () {
            var g = this._key,
              w = g.words
            if (w.length !== 2 && w.length !== 4 && w.length < 6)
              throw new Error(
                "Invalid key length - 3DES requires the key length to be 64, 128, 192 or >192.",
              )
            var m = w.slice(0, 2),
              y = w.length < 4 ? w.slice(0, 2) : w.slice(2, 4),
              v = w.length < 6 ? w.slice(0, 2) : w.slice(4, 6)
            ;((this._des1 = u.createEncryptor(r.create(m))),
              (this._des2 = u.createEncryptor(r.create(y))),
              (this._des3 = u.createEncryptor(r.create(v))))
          },
          encryptBlock: function (g, w) {
            ;(this._des1.encryptBlock(g, w),
              this._des2.decryptBlock(g, w),
              this._des3.encryptBlock(g, w))
          },
          decryptBlock: function (g, w) {
            ;(this._des3.decryptBlock(g, w),
              this._des2.encryptBlock(g, w),
              this._des1.decryptBlock(g, w))
          },
          keySize: 192 / 32,
          ivSize: 64 / 32,
          blockSize: 64 / 32,
        }))
        e.TripleDES = s._createHelper(f)
      })(),
      i.TripleDES
    )
  })
})
var Fl = W((ys, El) => {
  ;(function (i, e, t) {
    typeof ys == "object"
      ? (El.exports = ys = e(K(), wt(), xt(), tt(), pe()))
      : typeof define == "function" && define.amd
        ? define(
            ["./core", "./enc-base64", "./md5", "./evpkdf", "./cipher-core"],
            e,
          )
        : e(i.CryptoJS)
  })(ys, function (i) {
    return (
      (function () {
        var e = i,
          t = e.lib,
          r = t.StreamCipher,
          s = e.algo,
          n = (s.RC4 = r.extend({
            _doReset: function () {
              for (
                var c = this._key,
                  d = c.words,
                  l = c.sigBytes,
                  u = (this._S = []),
                  p = 0;
                p < 256;
                p++
              )
                u[p] = p
              for (var p = 0, h = 0; p < 256; p++) {
                var f = p % l,
                  g = (d[f >>> 2] >>> (24 - (f % 4) * 8)) & 255
                h = (h + u[p] + g) % 256
                var w = u[p]
                ;((u[p] = u[h]), (u[h] = w))
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
            var c = this._S, d = this._i, l = this._j, u = 0, p = 0;
            p < 4;
            p++
          ) {
            ;((d = (d + 1) % 256), (l = (l + c[d]) % 256))
            var h = c[d]
            ;((c[d] = c[l]),
              (c[l] = h),
              (u |= c[(c[d] + c[l]) % 256] << (24 - p * 8)))
          }
          return ((this._i = d), (this._j = l), u)
        }
        e.RC4 = r._createHelper(n)
        var a = (s.RC4Drop = n.extend({
          cfg: n.cfg.extend({ drop: 192 }),
          _doReset: function () {
            n._doReset.call(this)
            for (var c = this.cfg.drop; c > 0; c--) o.call(this)
          },
        }))
        e.RC4Drop = r._createHelper(a)
      })(),
      i.RC4
    )
  })
})
var Rl = W((ws, Il) => {
  ;(function (i, e, t) {
    typeof ws == "object"
      ? (Il.exports = ws = e(K(), wt(), xt(), tt(), pe()))
      : typeof define == "function" && define.amd
        ? define(
            ["./core", "./enc-base64", "./md5", "./evpkdf", "./cipher-core"],
            e,
          )
        : e(i.CryptoJS)
  })(ws, function (i) {
    return (
      (function () {
        var e = i,
          t = e.lib,
          r = t.StreamCipher,
          s = e.algo,
          n = [],
          o = [],
          a = [],
          c = (s.Rabbit = r.extend({
            _doReset: function () {
              for (var l = this._key.words, u = this.cfg.iv, p = 0; p < 4; p++)
                l[p] =
                  (((l[p] << 8) | (l[p] >>> 24)) & 16711935) |
                  (((l[p] << 24) | (l[p] >>> 8)) & 4278255360)
              var h = (this._X = [
                  l[0],
                  (l[3] << 16) | (l[2] >>> 16),
                  l[1],
                  (l[0] << 16) | (l[3] >>> 16),
                  l[2],
                  (l[1] << 16) | (l[0] >>> 16),
                  l[3],
                  (l[2] << 16) | (l[1] >>> 16),
                ]),
                f = (this._C = [
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
              for (var p = 0; p < 4; p++) d.call(this)
              for (var p = 0; p < 8; p++) f[p] ^= h[(p + 4) & 7]
              if (u) {
                var g = u.words,
                  w = g[0],
                  m = g[1],
                  y =
                    (((w << 8) | (w >>> 24)) & 16711935) |
                    (((w << 24) | (w >>> 8)) & 4278255360),
                  v =
                    (((m << 8) | (m >>> 24)) & 16711935) |
                    (((m << 24) | (m >>> 8)) & 4278255360),
                  x = (y >>> 16) | (v & 4294901760),
                  _ = (v << 16) | (y & 65535)
                ;((f[0] ^= y),
                  (f[1] ^= x),
                  (f[2] ^= v),
                  (f[3] ^= _),
                  (f[4] ^= y),
                  (f[5] ^= x),
                  (f[6] ^= v),
                  (f[7] ^= _))
                for (var p = 0; p < 4; p++) d.call(this)
              }
            },
            _doProcessBlock: function (l, u) {
              var p = this._X
              ;(d.call(this),
                (n[0] = p[0] ^ (p[5] >>> 16) ^ (p[3] << 16)),
                (n[1] = p[2] ^ (p[7] >>> 16) ^ (p[5] << 16)),
                (n[2] = p[4] ^ (p[1] >>> 16) ^ (p[7] << 16)),
                (n[3] = p[6] ^ (p[3] >>> 16) ^ (p[1] << 16)))
              for (var h = 0; h < 4; h++)
                ((n[h] =
                  (((n[h] << 8) | (n[h] >>> 24)) & 16711935) |
                  (((n[h] << 24) | (n[h] >>> 8)) & 4278255360)),
                  (l[u + h] ^= n[h]))
            },
            blockSize: 128 / 32,
            ivSize: 64 / 32,
          }))
        function d() {
          for (var l = this._X, u = this._C, p = 0; p < 8; p++) o[p] = u[p]
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
          for (var p = 0; p < 8; p++) {
            var h = l[p] + u[p],
              f = h & 65535,
              g = h >>> 16,
              w = ((((f * f) >>> 17) + f * g) >>> 15) + g * g,
              m = (((h & 4294901760) * h) | 0) + (((h & 65535) * h) | 0)
            a[p] = w ^ m
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
        e.Rabbit = r._createHelper(c)
      })(),
      i.Rabbit
    )
  })
})
var Ul = W((xs, Bl) => {
  ;(function (i, e, t) {
    typeof xs == "object"
      ? (Bl.exports = xs = e(K(), wt(), xt(), tt(), pe()))
      : typeof define == "function" && define.amd
        ? define(
            ["./core", "./enc-base64", "./md5", "./evpkdf", "./cipher-core"],
            e,
          )
        : e(i.CryptoJS)
  })(xs, function (i) {
    return (
      (function () {
        var e = i,
          t = e.lib,
          r = t.StreamCipher,
          s = e.algo,
          n = [],
          o = [],
          a = [],
          c = (s.RabbitLegacy = r.extend({
            _doReset: function () {
              var l = this._key.words,
                u = this.cfg.iv,
                p = (this._X = [
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
                var g = u.words,
                  w = g[0],
                  m = g[1],
                  y =
                    (((w << 8) | (w >>> 24)) & 16711935) |
                    (((w << 24) | (w >>> 8)) & 4278255360),
                  v =
                    (((m << 8) | (m >>> 24)) & 16711935) |
                    (((m << 24) | (m >>> 8)) & 4278255360),
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
              var p = this._X
              ;(d.call(this),
                (n[0] = p[0] ^ (p[5] >>> 16) ^ (p[3] << 16)),
                (n[1] = p[2] ^ (p[7] >>> 16) ^ (p[5] << 16)),
                (n[2] = p[4] ^ (p[1] >>> 16) ^ (p[7] << 16)),
                (n[3] = p[6] ^ (p[3] >>> 16) ^ (p[1] << 16)))
              for (var h = 0; h < 4; h++)
                ((n[h] =
                  (((n[h] << 8) | (n[h] >>> 24)) & 16711935) |
                  (((n[h] << 24) | (n[h] >>> 8)) & 4278255360)),
                  (l[u + h] ^= n[h]))
            },
            blockSize: 128 / 32,
            ivSize: 64 / 32,
          }))
        function d() {
          for (var l = this._X, u = this._C, p = 0; p < 8; p++) o[p] = u[p]
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
          for (var p = 0; p < 8; p++) {
            var h = l[p] + u[p],
              f = h & 65535,
              g = h >>> 16,
              w = ((((f * f) >>> 17) + f * g) >>> 15) + g * g,
              m = (((h & 4294901760) * h) | 0) + (((h & 65535) * h) | 0)
            a[p] = w ^ m
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
        e.RabbitLegacy = r._createHelper(c)
      })(),
      i.RabbitLegacy
    )
  })
})
var ql = W((_s, $l) => {
  ;(function (i, e, t) {
    typeof _s == "object"
      ? ($l.exports = _s = e(K(), wt(), xt(), tt(), pe()))
      : typeof define == "function" && define.amd
        ? define(
            ["./core", "./enc-base64", "./md5", "./evpkdf", "./cipher-core"],
            e,
          )
        : e(i.CryptoJS)
  })(_s, function (i) {
    return (
      (function () {
        var e = i,
          t = e.lib,
          r = t.BlockCipher,
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
        function d(f, g) {
          let w = (g >> 24) & 255,
            m = (g >> 16) & 255,
            y = (g >> 8) & 255,
            v = g & 255,
            x = f.sbox[0][w] + f.sbox[1][m]
          return ((x = x ^ f.sbox[2][y]), (x = x + f.sbox[3][v]), x)
        }
        function l(f, g, w) {
          let m = g,
            y = w,
            v
          for (let x = 0; x < n; ++x)
            ((m = m ^ f.pbox[x]), (y = d(f, m) ^ y), (v = m), (m = y), (y = v))
          return (
            (v = m),
            (m = y),
            (y = v),
            (y = y ^ f.pbox[n]),
            (m = m ^ f.pbox[n + 1]),
            { left: m, right: y }
          )
        }
        function u(f, g, w) {
          let m = g,
            y = w,
            v
          for (let x = n + 1; x > 1; --x)
            ((m = m ^ f.pbox[x]), (y = d(f, m) ^ y), (v = m), (m = y), (y = v))
          return (
            (v = m),
            (m = y),
            (y = v),
            (y = y ^ f.pbox[1]),
            (m = m ^ f.pbox[0]),
            { left: m, right: y }
          )
        }
        function p(f, g, w) {
          for (let _ = 0; _ < 4; _++) {
            f.sbox[_] = []
            for (let b = 0; b < 256; b++) f.sbox[_][b] = a[_][b]
          }
          let m = 0
          for (let _ = 0; _ < n + 2; _++)
            ((f.pbox[_] = o[_] ^ g[m]), m++, m >= w && (m = 0))
          let y = 0,
            v = 0,
            x = 0
          for (let _ = 0; _ < n + 2; _ += 2)
            ((x = l(f, y, v)),
              (y = x.left),
              (v = x.right),
              (f.pbox[_] = y),
              (f.pbox[_ + 1] = v))
          for (let _ = 0; _ < 4; _++)
            for (let b = 0; b < 256; b += 2)
              ((x = l(f, y, v)),
                (y = x.left),
                (v = x.right),
                (f.sbox[_][b] = y),
                (f.sbox[_][b + 1] = v))
          return !0
        }
        var h = (s.Blowfish = r.extend({
          _doReset: function () {
            if (this._keyPriorReset !== this._key) {
              var f = (this._keyPriorReset = this._key),
                g = f.words,
                w = f.sigBytes / 4
              p(c, g, w)
            }
          },
          encryptBlock: function (f, g) {
            var w = l(c, f[g], f[g + 1])
            ;((f[g] = w.left), (f[g + 1] = w.right))
          },
          decryptBlock: function (f, g) {
            var w = u(c, f[g], f[g + 1])
            ;((f[g] = w.left), (f[g + 1] = w.right))
          },
          blockSize: 64 / 32,
          keySize: 128 / 32,
          ivSize: 64 / 32,
        }))
        e.Blowfish = r._createHelper(h)
      })(),
      i.Blowfish
    )
  })
})
var Ur = W((vs, Ol) => {
  ;(function (i, e, t) {
    typeof vs == "object"
      ? (Ol.exports = vs =
          e(
            K(),
            Br(),
            Ud(),
            qd(),
            wt(),
            zd(),
            xt(),
            oo(),
            Gi(),
            Wd(),
            ao(),
            Vd(),
            Qd(),
            Yd(),
            es(),
            tl(),
            tt(),
            pe(),
            nl(),
            al(),
            dl(),
            ul(),
            hl(),
            ml(),
            yl(),
            xl(),
            vl(),
            kl(),
            Sl(),
            Cl(),
            Dl(),
            Fl(),
            Rl(),
            Ul(),
            ql(),
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
        : (i.CryptoJS = e(i.CryptoJS))
  })(vs, function (i) {
    return i
  })
})
function Ft(i) {
  return Be.default.MD5(i).toString(Be.default.enc.Hex)
}
function jl(i, e) {
  let t = e.match(/:\/\/[^/]+((\/[^/\s?#]+)*)/),
    r = t ? t[1] : e
  return `${i}:${r}`
}
function zl(i, e) {
  let t = `${i}${e}${Hl}${em}`,
    r = Be.default.SHA1(t).toString(Be.default.enc.Hex),
    s = Be.default.MD5(r).toString(Be.default.enc.Hex)
  return `div101.${i}${s}`
}
function Wl(i) {
  let e = i.length,
    t = 262144
  for (; e / t > 512 && t < 2097152; ) t = t << 1
  let r = []
  for (let n = 0; n < e; n += t) {
    let o = i.subarray(n, Math.min(n + t, e)),
      a = Be.default.lib.WordArray.create(o),
      c = Be.default.SHA1(a)
    r.push(c)
  }
  let s = Be.default.lib.WordArray.create()
  for (let n of r) s.concat(n)
  return Be.default.SHA1(s).toString(Be.default.enc.Hex)
}
var Be,
  Ll,
  rt,
  x_,
  Nl,
  bs,
  co,
  Ml,
  lo,
  Zf,
  Hl,
  em,
  $r,
  Kl = R(() => {
    "use strict"
    ;((Be = yr(Ur(), 1)),
      (Ll = "https://api-pan.xunlei.com/drive/v1"),
      (rt = `${Ll}/files`),
      (x_ = `${Ll}/tasks`),
      (Nl = "https://xluser-ssl.xunlei.com"),
      (bs = `${Nl}/v1`),
      (co = "drive#folder"),
      (Ml = "drive#file"),
      (lo = "UPLOAD_TYPE_RESUMABLE"),
      (Zf = "access_end_point_token"),
      (Hl = "40"),
      (em = "34a062aaa22f906fca4fefe9fb3a3021"))
    $r = class {
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
        for (let r of this.options.algorithms) t = Ft(t + r)
        return { timestamp: e, sign: `1.${t}` }
      }
      async refreshCaptchaToken(e, t) {
        let r = {
            action: e,
            captcha_token: this.captchaToken,
            client_id: this.options.clientId,
            device_id: this.options.deviceId,
            meta: t,
            redirect_uri: "xlaccsdk01://xunlei.com/callback?state=harbor",
          },
          s = await this.rawRequest(`${bs}/shield/captcha/init`, {
            method: "POST",
            body: r,
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
        let { timestamp: r, sign: s } = this.getCaptchaSign(),
          n = {
            client_version: this.options.clientVersion,
            package_name: this.options.packageName,
            user_id: t,
            timestamp: r,
            captcha_sign: s,
          }
        await this.refreshCaptchaToken(e, n)
      }
      async refreshCaptchaTokenInLogin(e, t) {
        let r = {}
        ;(/\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/.test(t)
          ? (r.email = t)
          : t.length >= 11 && t.length <= 18
            ? (r.phone_number = t)
            : (r.username = t),
          await this.refreshCaptchaToken(e, r))
      }
      formatReviewData(e) {
        let t = zl(this.options.deviceId, this.options.packageName),
          r = {
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
        <pre style="margin: 0; white-space: pre-wrap;"><code>${JSON.stringify(r, null, 2)}</code></pre>
    </div>
</div>`
        return new Error(n)
      }
      async rawRequest(e, t = {}) {
        let r = {
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
              r["content-type"] ||
                (r["content-type"] = "application/json;charset=UTF-8")))
        let n = await fetch(e, {
            method: t.method || "GET",
            headers: r,
            body: s,
          }),
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
        let r = {
            Authorization: `${this.tokenResp.token_type} ${this.tokenResp.access_token}`,
            "X-Captcha-Token": this.captchaToken,
            ...(t.headers || {}),
          },
          s = await this.rawRequest(e, { ...t, headers: r }),
          n = s?.error_code || 0
        if (n === 4122 || n === 4121 || n === 10 || n === 16) {
          if (this.tokenResp?.refresh_token) {
            let o = await this.refreshToken(this.tokenResp.refresh_token)
            return (
              (this.tokenResp = o),
              this.options.onPersistToken &&
                (await this.options.onPersistToken(o)),
              this.authRequest(e, t)
            )
          }
          throw new Error(`Token expired error ${n}`)
        } else if (n === 9) {
          let o = jl(t.method || "GET", e)
          return (
            await this.refreshCaptchaTokenAtLogin(
              o,
              this.tokenResp.user_id || "",
            ),
            this.authRequest(e, t)
          )
        } else if (n !== 0 || (s.error && s.error !== "success"))
          throw new Error(
            `ErrorCode: ${s.error_code || 0}, Error: ${s.error || ""}, ErrorDescription: ${s.error_description || ""}`,
          )
        return s
      }
      async coreLogin(e, t) {
        let r = `${Nl}/xluser.core.login/v3/login`,
          s = {
            protocolVersion: "301",
            sequenceNo: "1000012",
            platformVersion: "10",
            isCompressed: "0",
            appid: Hl,
            clientVersion: this.options.clientVersion,
            peerID: "00000000000000000000000000000000",
            appName: "ANDROID-com.xunlei.downloadprovider",
            sdkVersion: "512000",
            devicesign: zl(this.options.deviceId, this.options.packageName),
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
          n = await this.rawRequest(r, {
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
          n = `${bs}/auth/signin/token`
        await this.refreshCaptchaTokenInLogin(jl("POST", n), e)
        let o = await this.rawRequest(n, {
          method: "POST",
          body: {
            client_id: this.options.clientId,
            client_secret: this.options.clientSecret,
            provider: Zf,
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
        let t = `${bs}/auth/token`,
          r = await this.rawRequest(t, {
            method: "POST",
            body: {
              grant_type: "refresh_token",
              refresh_token: e,
              client_id: this.options.clientId,
              client_secret: this.options.clientSecret,
            },
          })
        return (
          (this.tokenResp = r),
          this.options.onPersistToken && (await this.options.onPersistToken(r)),
          r
        )
      }
      async isLogin() {
        if (!this.tokenResp?.access_token) return !1
        try {
          return (
            await this.authRequest(`${bs}/user/me`, { method: "GET" }),
            !0
          )
        } catch {
          return !1
        }
      }
    }
  })
function Gl(i, e, t) {
  let r = i.kind === co,
    s = i.web_content_link || ""
  if (t && i.medias && i.medias.length > 0) {
    for (let n of i.medias)
      if (n.link?.url) {
        s = n.link.url
        break
      }
  }
  return {
    name: i.name,
    size: parseInt(i.size || "0", 10),
    is_dir: r,
    modified: i.modified_time || i.created_time || new Date().toISOString(),
    sign: "",
    type: z(i.name, r),
    thumb: i.thumbnail_link || i.icon_link || "",
    raw_url: s,
    raw_url_headers: { "User-Agent": e },
  }
}
function Vl(i) {
  if (i?.device_id && i.device_id.trim().length === 32)
    return i.device_id.trim()
  let e = `${i?.username || ""}${i?.password || ""}`
  return e.trim()
    ? Ft(e)
    : Ft(Math.random().toString(36) + Date.now().toString(36))
}
var qr,
  ks,
  Jl = R(() => {
    "use strict"
    ee()
    ie()
    Kl()
    ;((qr = class {
      client
      addition
      identity = ""
      onPersistCallback
      constructor(e, t) {
        ;((this.addition = e), (this.onPersistCallback = t))
        let r = Vl(e)
        ;((e.device_id = r),
          (this.client = new $r({
            deviceId: r,
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
                  device_id: r,
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
          r = Ft(`${e}${t}`)
        ;(this.identity !== r || !(await this.client.isLogin())) &&
          ((this.identity = r), await this.client.login(e, t))
      }
      resolveFolderId(e) {
        if (!e || e === "/" || e === "0")
          return this.addition.root_folder_id || ""
        let t = e.split("/").filter(Boolean)
        return t[t.length - 1] || this.addition.root_folder_id || ""
      }
      async list(e, t) {
        let r = this.resolveFolderId(t),
          s = [],
          n = ""
        for (;;) {
          let o = new URL(rt)
          ;(o.searchParams.set("space", this.addition.space || ""),
            o.searchParams.set("__type", "drive"),
            o.searchParams.set("refresh", "true"),
            o.searchParams.set("__sync", "true"),
            o.searchParams.set("parent_id", r),
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
              s.push(Gl(c, this.downloadUserAgent, this.useVideoUrl))
          if (!a.next_page_token) break
          n = a.next_page_token
        }
        return N(s, this.addition.order_by, this.addition.order_direction)
      }
      async get(e, t) {
        let r = this.resolveFolderId(t),
          s = new URL(`${rt}/${r}`)
        s.searchParams.set("space", this.addition.space || "")
        let n = await this.client.authRequest(s.toString(), { method: "GET" })
        return Gl(n, this.downloadUserAgent, this.useVideoUrl)
      }
      async mkdir(e, t) {
        let r = t.split("/").filter(Boolean),
          s = r.pop() || "new_folder",
          n = "/" + r.join("/"),
          o = this.resolveFolderId(n)
        await this.client.authRequest(rt, {
          method: "POST",
          body: {
            kind: co,
            name: s,
            parent_id: o,
            space: this.addition.space || "",
          },
        })
      }
      async rename(e, t, r) {
        let s = this.resolveFolderId(t)
        await this.client.authRequest(`${rt}/${s}`, {
          method: "PATCH",
          body: { name: r, space: this.addition.space || "" },
        })
      }
      async remove(e, t, r) {
        let s = this.resolveFolderId(t),
          n = new URL(`${rt}/${s}/trash`)
        ;(n.searchParams.set("space", this.addition.space || ""),
          await this.client.authRequest(n.toString(), {
            method: "PATCH",
            body: {},
          }))
      }
      async move(e, t, r, s, n) {
        let o = this.resolveFolderId(s),
          a = this.resolveFolderId(t)
        await this.client.authRequest(`${rt}:batchMove`, {
          method: "POST",
          body: {
            to: { parent_id: a },
            ids: [o],
            space: this.addition.space || "",
          },
        })
      }
      async copy(e, t, r, s, n) {
        let o = this.resolveFolderId(s),
          a = this.resolveFolderId(t)
        await this.client.authRequest(`${rt}:batchCopy`, {
          method: "POST",
          body: {
            to: { parent_id: a },
            ids: [o],
            space: this.addition.space || "",
          },
        })
      }
      async put(e, t, r) {
        let s = t.split("/").filter(Boolean),
          n = s.pop() || "file",
          o = "/" + s.join("/"),
          a = this.resolveFolderId(o),
          c = Wl(r),
          d = await this.client.authRequest(rt, {
            method: "POST",
            body: {
              kind: Ml,
              parent_id: a,
              name: n,
              size: r.length.toString(),
              hash: c,
              upload_type: lo,
              space: this.addition.space || "",
            },
          })
        if (d.upload_type === lo && d.resumable?.params) {
          let l = d.resumable.params,
            u = l.endpoint
          ;(u.startsWith(l.bucket + ".") && (u = u.slice(l.bucket.length + 1)),
            !u.startsWith("http://") &&
              !u.startsWith("https://") &&
              (u = `https://${u}`))
          let p = `${u.replace(/\/$/, "")}/${l.bucket}/${l.key}`,
            h = { "x-amz-security-token": l.security_token },
            f = await fetch(p, { method: "PUT", headers: h, body: r })
          if (!f.ok)
            throw new Error(`S3 Upload failed: ${f.status} ${f.statusText}`)
        }
      }
    }),
      (ks = class extends qr {
        constructor(e, t) {
          super(e, t)
          let r = Vl(e)
          e.device_id = r
          let s =
            e.sign_type === "captcha_sign"
              ? void 0
              : (e.algorithms || "")
                  .split(",")
                  .map((n) => n.trim())
                  .filter(Boolean)
          this.client = new $r({
            deviceId: r,
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
                  device_id: r,
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
            ? (t = Ft(e.refresh_token || ""))
            : (t = Ft(`${e.username || ""}${e.password || ""}`)),
            (this.identity !== t || !(await this.client.isLogin())) &&
              ((this.identity = t),
              e.login_type === "refresh_token" && e.refresh_token
                ? await this.client.refreshToken(e.refresh_token)
                : e.username &&
                  e.password &&
                  (await this.client.login(e.username, e.password))))
        }
      }))
  })
function Ql(i) {
  if (!i) return new Date().toISOString()
  let e = i.trim(),
    t = new Date(e)
  if (!isNaN(t.getTime())) return t.toISOString()
  let r = Date.now(),
    s = 864e5,
    n = e.match(tm)
  if (n) {
    let o = parseFloat(n[1]) || 0,
      a = n[2]
    if (a.includes("\u79D2\u524D")) return new Date(r - o * 1e3).toISOString()
    if (a.includes("\u5206") || a.includes("\u5206\u949F\u524D"))
      return new Date(r - o * 6e4).toISOString()
    if (a.includes("\u5C0F\u65F6\u524D") || a.includes("\u5C0F\u65F6"))
      return new Date(r - o * 36e5).toISOString()
    if (a.includes("\u5929\u524D") || a.includes("\u5929"))
      return new Date(r - o * s).toISOString()
    if (a.includes("\u6628\u5929")) return new Date(r - s).toISOString()
    if (a.includes("\u524D\u5929")) return new Date(r - s * 2).toISOString()
  }
  return new Date().toISOString()
}
function Xl(i) {
  if (!i) return 0
  let e = i.trim().match(rm)
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
function Or(i) {
  return i.replace(/<!--[\s\S]*?-->|[^:]\/\/.*|\/\*[\s\S]*?\*\//g, (e) =>
    e.slice(1, 3) === "//"
      ? e.slice(0, 1)
      : `
`,
  )
}
function Yl(i) {
  let e = "",
    t = !1,
    r = !1
  for (let s = 0; s < i.length; s++) {
    let n = i[s]
    if (
      r &&
      (n ===
        `
` ||
        n === "\r")
    ) {
      ;((r = !1), (e += n))
      continue
    }
    if (t && n === "*" && s + 1 < i.length && i[s + 1] === "/") {
      ;((t = !1), s++)
      continue
    }
    if (!(t || r)) {
      if (n === "/" && s + 1 < i.length) {
        let o = i[s + 1]
        if (o === "*") {
          ;((t = !0), s++)
          continue
        } else if (o === "/") {
          ;((r = !0), s++)
          continue
        }
      }
      e += n
    }
  }
  return e
}
function sm(i) {
  let e = [
      6, 28, 34, 31, 33, 18, 30, 23, 9, 8, 19, 38, 17, 24, 0, 5, 32, 21, 10, 22,
      25, 14, 15, 3, 16, 27, 13, 35, 2, 29, 11, 26, 4, 36, 1, 39, 37, 7, 20, 12,
    ],
    t = new Array(i.length).fill("")
  for (let r = 0; r < e.length; r++) {
    let s = e[r]
    s < t.length && r < i.length && (t[s] = i[r])
  }
  return t.join("")
}
function nm(i, e) {
  let t = Math.min(i.length, e.length),
    r = Math.floor(t / 2),
    s = ""
  for (let n = 0; n < r; n++) {
    let o = parseInt(i.slice(n * 2, n * 2 + 2), 16),
      a = parseInt(e.slice(n * 2, n * 2 + 2), 16),
      c = o ^ a
    s += c.toString(16).padStart(2, "0")
  }
  return s
}
function Ps(i) {
  let e = i.match(im)
  if (!e || e.length < 2)
    throw new Error(
      "[Lanzou] \u65E0\u6CD5\u5339\u914D\u5230 acw_sc__v2 \u7684 arg1 \u53C2\u6570",
    )
  let t = e[1]
  return nm(sm(t), "3000176000856006061501533003690027800375")
}
function om(i, e) {
  if (!i || !e) return ""
  if (i !== "sasign") {
    let t = e.match(
      new RegExp(
        `(?:var|let|const)\\s+${i}\\s*=\\s*['"]?([\\s\\S]*?)['"]?;`,
        "i",
      ),
    )
    if (t) return t[1].trim().replace(/^['"]|['"]$/g, "")
    let r = e.match(
      new RegExp(`(?:^|[;,\\s])${i}\\s*=\\s*['"]?([\\s\\S]*?)['"]?;`, "im"),
    )
    if (r) return r[1].trim().replace(/^['"]|['"]$/g, "")
    let s = e.match(
      new RegExp(`['"]?${i}['"]?\\s*:\\s*['"]?([\\s\\S]*?)['"]?`, "i"),
    )
    return s ? s[1].trim().replace(/^['"]|['"]$/g, "") : ""
  } else {
    let t = Array.from(
      e.matchAll(
        new RegExp(
          `(?:var|let|const)?\\s*${i}\\s*=\\s*['"]?([\\s\\S]*?)['"]?;`,
          "gi",
        ),
      ),
    )
    if (t.length === 3) return t[1][1].trim().replace(/^['"]|['"]$/g, "")
    if (t.length > 0) return t[0][1].trim().replace(/^['"]|['"]$/g, "")
  }
  return ""
}
function am(i, e) {
  let t = {},
    r = /['"]?([a-zA-Z0-9_$]+)['"]?\s*:\s*(['"]?([^'",}\s]+)['"]?)/g,
    s = i.matchAll(r)
  for (let n of s) {
    let o = n[1],
      a = n[2],
      c = n[3]
    if (!c) t[o] = ""
    else if (a.includes("'") || a.includes('"') || /^\d+$/.test(a)) t[o] = c
    else {
      let d = om(c, e)
      t[o] = d !== "" ? d : c
    }
  }
  return t
}
function cm(i) {
  let e = {},
    t = i.split("&")
  for (let r of t) {
    let [s, n] = r.split("=")
    s && (e[decodeURIComponent(s)] = decodeURIComponent(n || ""))
  }
  return e
}
function Zt(i, e) {
  let t = e || i,
    r = Array.from(i.matchAll(/data\s*:\s*({[\s\S]*?})/g))
  if (r.length > 0) {
    let n = r[0][1]
    for (let a of r) a[1].length > n.length && (n = a[1])
    let o = am(n, t)
    if (Object.keys(o).length > 0) return o
  }
  let s = i.match(/data\s*:\s*['"]([^'"]+)['"]/)
  if (s && s[1].includes("=")) return cm(s[1])
  throw new Error(
    "[Lanzou] \u672A\u80FD\u627E\u5230\u8BF7\u6C42\u53C2\u6570 data \u5BF9\u8C61",
  )
}
function Zl(i, e) {
  let t = new RegExp(`function\\s+${e}\\s*\\([^)]*\\)\\s*\\{`, "i"),
    r = i.search(t)
  if (r === -1) throw new Error(`[Lanzou] \u672A\u627E\u5230\u51FD\u6570 ${e}`)
  let s = 0,
    n = -1
  for (let o = r; o < i.length; o++)
    if (i[o] === "{") (s === 0 && (n = o), s++)
    else if (i[o] === "}" && (s--, s === 0)) return i.slice(r, o + 1)
  return i.slice(r)
}
var tm,
  rm,
  im,
  uo = R(() => {
    "use strict"
    ;((tm = /([0-9.]*)\s*([\u4e00-\u9fa5]+)/),
      (rm = /([0-9.]+)\s*([bkm]+)/i),
      (im = /arg1='([0-9A-Z]+)'/i))
  })
var Ss,
  eu = R(() => {
    "use strict"
    uo()
    Ss = class {
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
          r = e.split(/,(?=[a-zA-Z0-9_\-]+=[^;]+)/)
        for (let n of r) {
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
        s !== this.cookie &&
          ((this.cookie = s), this.onCookieUpdate?.(this.cookie))
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
          let r = {
            "User-Agent": this.getUserAgent(),
            Referer: "https://pc.woozooo.com",
            "Content-Type": "application/x-www-form-urlencoded",
          }
          e && (r.Cookie = `acw_sc__v2=${e}`)
          let s = await fetch("https://up.woozooo.com/mlogin.php", {
            method: "POST",
            headers: r,
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
            e = Ps(n)
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
        let r = Or(e)
        try {
          let s = Zt(r)
          this.vei = s.vei || ""
        } catch {
          let s = e.match(/['"]?vei['"]?\s*:\s*['"]?([^'",\s]+)['"]?/)
          s && (this.vei = s[1])
        }
      }
      async request(e, t = "GET", r, s) {
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
          r &&
            t === "POST" &&
            ((c["Content-Type"] =
              "application/x-www-form-urlencoded; charset=UTF-8"),
            (l = new URLSearchParams(r).toString()))
          let u = await fetch(e, { method: t, headers: c, body: l })
          this.updateCookie(u.headers.get("set-cookie"))
          let p = await u.text()
          if (p.includes("acw_sc__v2")) {
            n = Ps(p)
            continue
          }
          return p
        }
        throw new Error(
          "[Lanzou] \u8BF7\u6C42\u89E6\u53D1 acw_sc__v2 \u6821\u9A8C\u8D85\u9650",
        )
      }
      async doupload(e) {
        let t = `${this.getBaseUrl()}/doupload.php?uid=${this.uid}&vei=${this.vei}`,
          r = await this.request(t, "POST", e),
          s
        try {
          s = JSON.parse(r)
        } catch {
          throw new Error(
            `[Lanzou] \u975E JSON \u54CD\u5E94: ${r.slice(0, 200)}`,
          )
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
          r = await this.getFiles(e)
        return [...t, ...r]
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
        for (let r = 1; ; r++) {
          let n =
            (
              await this.doupload({
                task: "5",
                folder_id: e || "-1",
                pg: String(r),
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
        let r = e.replace(/^\//, ""),
          s = await this.request(`${this.getShareUrl()}/${r}`, "GET")
        if (s.includes("\u53D6\u6D88\u5206\u4EAB"))
          throw new Error(
            "[Lanzou] \u8BE5\u6587\u4EF6\u5DF2\u53D6\u6D88\u5206\u4EAB",
          )
        if (s.includes("\u6587\u4EF6\u4E0D\u5B58\u5728"))
          throw new Error("[Lanzou] \u6587\u4EF6\u4E0D\u5B58\u5728")
        return /class="fileinfo"|id="file"|文件描述/i.test(s)
          ? [await this.getFilesByShareUrl(r, t, s)]
          : this.getFolderByShareUrl(t, s)
      }
      async getFolderByShareUrl(e, t) {
        let r = Or(t),
          s = {}
        try {
          s = Zt(r)
        } catch {
          s = {}
        }
        let n = [],
          o = Array.from(
            t.matchAll(
              /(?:folderlink|mbxfolder)[^>]*href=["']\/?([^"']+)["'][^>]*>(.+?)<\//gi,
            ),
          )
        for (let a of o)
          n.push({ id: a[1], name_all: a[2].trim(), is_folder: !0 })
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
      async getFilesByShareUrl(e, t = "", r, s) {
        let n = e.replace(/^\//, ""),
          o = (s || this.getShareUrl()).replace(/\/+$/, ""),
          a = `${o}/${n}`,
          c = r
        ;(c || (c = await this.request(a, "GET")), (c = Or(c)), (c = Yl(c)))
        let d = {},
          l = "",
          u = "",
          p = { id: n, is_folder: !1 }
        if (c.includes("pwdload") || c.includes("passwddiv")) {
          let y = Zl(c, "down_p")
          ;((d = Zt(y, c)), (d.p = t || this.addition.share_password || ""))
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
          ;((p.name_all = b.inf || "download"),
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
            b = Or(_)
          d = Zt(b, b)
          let P =
              b.match(/['"]?\/?ajaxm\.php\?file=(\d+)['"]?/) ||
              b.match(/file\s*[:=]\s*['"]?(\d+)['"]?/) ||
              b.match(/file=(\d+)/) ||
              b.match(/var\s+file_id\s*=\s*['"]?(\d+)['"]?/),
            A = P ? P[1] : ""
          if (!A) throw new Error("[Lanzou] \u672A\u627E\u5230\u6587\u4EF6 ID")
          let C = await this.request(`${o}/ajaxm.php?file=${A}`, "POST", d, x),
            S
          try {
            S = JSON.parse(C)
          } catch {
            throw new Error(
              `[Lanzou] ajaxm.php \u54CD\u5E94\u683C\u5F0F\u9519\u8BEF: ${C}`,
            )
          }
          if (S.zt !== 1)
            throw new Error(
              S.info ||
                S.text ||
                `[Lanzou] \u63D0\u53D6\u94FE\u63A5\u5931\u8D25 (zt=${S.zt})`,
            )
          ;((l = `${S.dom}/file`), (u = `${l}/${S.url}`))
          let k = c.match(
            /<title>(.+?) - 蓝奏云<\/title>|id="filenajax">(.+?)<\/div>|var filename = ['"](.+?)['"];|<div style="font-size[^>]*>([^<>]+)<\/div>|<div class="filethetext"[^>]*>([^<>]+)<\/div>/i,
          )
          if (k) {
            for (let D = 1; D < k.length; D++)
              if (k[D]) {
                p.name_all = k[D].trim()
                break
              }
          }
        }
        let f = c.match(/大小\W*([0-9.]+\s*[bkm]+)/i)
        f && (p.size = f[1])
        let g = c.match(/\d+\s*[秒天分小][钟时]?前|[昨前]天|\d{4}-\d{2}-\d{2}/)
        g && (p.time = g[0])
        let w = u,
          m = ""
        for (let y = 0; y < 3; y++) {
          let v = {
              Referer: l,
              "User-Agent": this.getUserAgent(),
              "Accept-Language":
                "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
            },
            x = "down_ip=1"
          ;(m && (x += `; acw_sc__v2=${m}`), (v.Cookie = x))
          let _ = await fetch(u, {
            method: "GET",
            headers: v,
            redirect: "manual",
          })
          if (
            _.status === 301 ||
            _.status === 302 ||
            _.status === 303 ||
            _.status === 307 ||
            _.status === 308
          ) {
            let P = _.headers.get("location")
            if (P) {
              w = new URL(P, u).toString()
              break
            }
          }
          if (_.status === 200 && _.url && _.url !== u) {
            w = _.url
            break
          }
          let b = await _.text()
          if (b.includes("acw_sc__v2")) {
            m = Ps(b)
            continue
          }
          try {
            let P = Zt(b, b)
            ;((P.el = "2"), await new Promise((S) => setTimeout(S, 1500)))
            let A = await this.request(`${l}/ajax.php`, "POST", P, l),
              C = JSON.parse(A)
            if (C.url) {
              w = C.url.startsWith("http")
                ? C.url
                : new URL(C.url, l).toString()
              break
            }
          } catch {}
          break
        }
        return ((p.url = w), p)
      }
      async getFileRealInfo(e) {
        try {
          let t = await fetch(e, {
              method: "HEAD",
              headers: { "User-Agent": this.getUserAgent() },
            }),
            r = t.headers.get("content-length"),
            s = t.headers.get("last-modified")
          return {
            size: r ? parseInt(r, 10) : void 0,
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
  })
function dm(i) {
  let e = { ...(i || {}) }
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
function po(i, e) {
  let t = !!i.is_folder || !!i.fol_id,
    r = i.name_all || i.name || "",
    s = e?.size !== void 0 ? e.size : Xl(i.size || "0"),
    n = e?.time ? e.time : Ql(i.time || ""),
    o = i.fol_id || i.id || ""
  return {
    name: r,
    size: s,
    is_dir: t,
    modified: n,
    sign: o,
    type: z(r, t),
    thumb: "",
    raw_url: i.url || "",
  }
}
var As,
  tu = R(() => {
    "use strict"
    ee()
    ie()
    eu()
    uo()
    As = class {
      client
      addition
      pathIdCache = new Map()
      constructor(e, t) {
        ;((this.addition = dm(e)), (this.client = new Ss(this.addition, t)))
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
          r =
            "/" +
            String(e || "")
              .split("/")
              .filter(Boolean)
              .join("/")
        if (r === "/" || r === `/${t}`) return t
        let s = r.split("/").filter(Boolean),
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
            p = (
              this.isUrlMode()
                ? await this.client.getFileOrFolderByShareUrl(
                    o,
                    this.addition.share_password,
                  )
                : await this.client.getFolders(o)
            ).find((h) => {
              if (!h.is_folder && !h.fol_id) return !1
              let f = h.name || h.name_all || "",
                g = h.fol_id || h.id || ""
              return f === d || f === l || g === d || g === l
            })
          if (!p)
            throw new Error(`[Lanzou] \u76EE\u5F55\u672A\u627E\u5230: ${d}`)
          ;((o = p.fol_id || p.id || ""),
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
          r = t.split("/").filter(Boolean)
        if (r.length === 0) throw new Error("[Lanzou] \u8DEF\u5F84\u65E0\u6548")
        let s = r[r.length - 1],
          n = (() => {
            try {
              return decodeURIComponent(s)
            } catch {
              return s
            }
          })(),
          o = "/" + r.slice(0, r.length - 1).join("/"),
          a = await this.resolveFolderId(o),
          d = (
            this.isUrlMode()
              ? await this.client.getFileOrFolderByShareUrl(
                  a,
                  this.addition.share_password,
                )
              : await this.client.getAllFiles(a)
          ).find((u) => {
            let p = u.name_all || u.name || "",
              h = u.fol_id || u.id || ""
            return p === s || p === n || h === s || h === n
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
        let r = await this.resolveFolderId(t),
          n = (
            this.isUrlMode()
              ? await this.client.getFileOrFolderByShareUrl(
                  r,
                  this.addition.share_password,
                )
              : await this.client.getAllFiles(r)
          ).map((o) => po(o))
        return N(
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
        let r = String(t || "")
          .split("/")
          .filter(Boolean)
        if (r.length === 0 || r[r.length - 1] === this.getRootId()) {
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
        if (n) return po(s)
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
                let p = await this.client.getFilesByShareUrl(
                  l,
                  d.pwd || "",
                  void 0,
                  u,
                )
                ;((o = p.url),
                  p.name_all && (s.name_all = p.name_all),
                  p.size && (s.size = p.size))
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
        let c = po(s, a)
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
        let r = String(t || "")
            .split("/")
            .filter(Boolean),
          s = r.pop() || "\u65B0\u6587\u4EF6\u5939",
          n = "/" + r.join("/"),
          o = await this.resolveFolderId(n)
        await this.client.mkdir(o, s)
      }
      async rename(e, t, r) {
        if (this.isUrlMode())
          throw new Error(
            "[Lanzou] \u5206\u4EAB\u94FE\u63A5\u6A21\u5F0F\u4E0D\u652F\u6301\u91CD\u547D\u540D",
          )
        let { item: s, isDir: n } = await this.resolveItem(t)
        if (n)
          throw new Error(
            "[Lanzou] \u84DD\u594F\u4E91\u4E0D\u652F\u6301\u91CD\u547D\u540D\u6587\u4EF6\u5939",
          )
        await this.client.rename(s.id || "", r)
      }
      async remove(e, t, r) {
        if (this.isUrlMode())
          throw new Error(
            "[Lanzou] \u5206\u4EAB\u94FE\u63A5\u6A21\u5F0F\u4E0D\u652F\u6301\u5220\u9664",
          )
        let { item: s, isDir: n } = await this.resolveItem(t)
        await this.client.remove(s.fol_id || s.id || "", n)
      }
      async move(e, t, r, s, n) {
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
  })
function lm(i) {
  let e = i.replace(/\s+/g, ""),
    t = atob(e),
    r = new Uint8Array(t.length)
  for (let s = 0; s < t.length; s++) r[s] = t.charCodeAt(s)
  return r
}
function um(i) {
  let e = ""
  for (let t = 0; t < i.length; t++) e += String.fromCharCode(i[t])
  return btoa(e)
}
function pm(i) {
  return Array.from(i)
    .map((e) => e.toString(16).padStart(2, "0"))
    .join("")
}
function ho(i) {
  let e = 0n
  for (let t = 0; t < i.length; t++) e = (e << 8n) | BigInt(i[t])
  return e
}
function hm(i, e) {
  let t = new Uint8Array(e),
    r = i
  for (let s = e - 1; s >= 0; s--) ((t[s] = Number(r & 0xffn)), (r >>= 8n))
  return t
}
function fm(i, e, t) {
  let r = 1n
  for (i = i % t; e > 0n; )
    (e % 2n === 1n && (r = (r * i) % t), (i = (i * i) % t), (e /= 2n))
  return r
}
function mm(i) {
  let e = i
      .replace(/-----BEGIN[^-]+-----/g, "")
      .replace(/-----END[^-]+-----/g, "")
      .replace(/\s+/g, ""),
    t = lm(e),
    r = 0
  function s() {
    let d = t[r++],
      l = t[r++]
    if (l & 128) {
      let p = l & 127
      l = 0
      for (let h = 0; h < p; h++) l = (l << 8) | t[r++]
    }
    return { tag: d, length: l, dataStart: r }
  }
  let n = []
  function o(d, l) {
    let u = d
    for (; u < l; ) {
      let p = t[u++],
        h = t[u++]
      if (h & 128) {
        let g = h & 127
        h = 0
        for (let w = 0; w < g; w++) h = (h << 8) | t[u++]
      }
      let f = u
      if (((u += h), p === 2)) {
        let g = t.subarray(f, f + h)
        ;(g[0] === 0 && g.length > 1 && (g = g.subarray(1)), n.push(g))
      } else
        p === 48 || (p & 32) !== 0
          ? o(f, f + h)
          : p === 3 && t[f] === 0 && o(f + 1, f + h)
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
  return { n: ho(a), e: ho(c), keyLength: a.length }
}
function Cs(i, e, t = !1) {
  let { n: r, e: s, keyLength: n } = mm(e),
    o = typeof i == "string" ? new TextEncoder().encode(i) : i
  if (o.length > n - 11)
    throw new Error(`Data too long for RSA key size: ${o.length} > ${n - 11}`)
  let a = n - o.length - 3,
    c = new Uint8Array(a),
    d = new Uint8Array(a * 2)
  crypto.getRandomValues(d)
  let l = 0
  for (let g = 0; g < a; g++) {
    let w = d[l++]
    for (; w === 0; )
      (l >= d.length && (crypto.getRandomValues(d), (l = 0)), (w = d[l++]))
    c[g] = w
  }
  let u = new Uint8Array(n)
  ;((u[0] = 0), (u[1] = 2), u.set(c, 2), (u[2 + a] = 0), u.set(o, 3 + a))
  let p = ho(u),
    h = fm(p, s, r),
    f = hm(h, n)
  return t ? pm(f) : um(f)
}
function ru(i, e) {
  let t =
      typeof e == "string"
        ? we.default.enc.Utf8.parse(e.slice(0, 16))
        : we.default.lib.WordArray.create(Array.from(e.slice(0, 16)), 16),
    r = we.default.enc.Utf8.parse(i)
  return we.default.AES.encrypt(r, t, {
    mode: we.default.mode.ECB,
    padding: we.default.pad.Pkcs7,
  }).ciphertext.toString(we.default.enc.Hex)
}
function iu(i, e) {
  return we.default.HmacSHA1(i, e).toString(we.default.enc.Hex)
}
function su(i) {
  return typeof i == "string"
    ? we.default.enc.Utf8.parse(i)
    : we.default.lib.WordArray.create(i)
}
function Ts(i) {
  return we.default.MD5(su(i)).toString(we.default.enc.Hex)
}
function nu(i) {
  return we.default.MD5(su(i)).toString(we.default.enc.Base64)
}
function fo(i = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx") {
  return i.replace(/[xy]/g, (e) => {
    let t = (Math.random() * 16) | 0
    return (e === "x" ? t : (t & 3) | 8).toString(16)
  })
}
function mo() {
  return (
    "0." +
    Math.floor(Math.random() * 1e17)
      .toString()
      .padStart(17, "0")
  )
}
var we,
  go = R(() => {
    "use strict"
    we = yr(Ur(), 1)
  })
function gm(i, e, t) {
  let r = i ? i.split(";").map((o) => o.trim()) : [],
    s = `${e}=${t}`,
    n = r.findIndex((o) => o.startsWith(`${e}=`))
  return (n !== -1 ? (r[n] = s) : r.push(s), r.filter(Boolean).join("; "))
}
function ym(i, e) {
  if (!e) return i
  let t = i,
    r = e.split(/,(?=\s*[a-zA-Z0-9_\-]+=[^;]+)/)
  for (let s of r) {
    let n = s.split(";")[0].trim(),
      o = n.indexOf("=")
    if (o > 0) {
      let a = n.slice(0, o).trim(),
        c = n.slice(o + 1).trim()
      t = gm(t, a, c)
    }
  }
  return t
}
function wm(i) {
  let e = i
  if (typeof e.getSetCookie == "function") {
    let r = e.getSetCookie()
    if (r.length > 0) return r
  }
  let t = i.get("set-cookie")
  return t ? [t] : []
}
function ou(i) {
  let e = i.replace(/("id"\s*:\s*)(-?\d{16,})(?=\s*[,}])/g, '$1"$2"')
  return JSON.parse(e)
}
function yo(i) {
  return i.protocol === "https:" && xm.has(i.hostname)
}
function au(i) {
  try {
    let e = new URL(i, "https://open.e.189.cn")
    return !!e.searchParams.get("lt") && !!e.searchParams.get("reqId")
  } catch {
    return !1
  }
}
function wo(i) {
  try {
    let e = new URL(i, "https://open.e.189.cn")
    return (
      e.hostname === "cloud.189.cn" &&
      (e.pathname === "/web/main" || e.pathname === "/main.action")
    )
  } catch {
    return !1
  }
}
var xm,
  Ds,
  cu = R(() => {
    "use strict"
    go()
    xm = new Set(["cloud.189.cn", "open.e.189.cn"])
    Ds = class {
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
        let t = wm(e)
        if (t.length === 0) return
        let r = t.reduce((s, n) => ym(s, n), this.cookie)
        r !== this.cookie && ((this.cookie = r), (this.cookieDirty = !0))
      }
      async followRedirectsWithCookies(e, t) {
        let r = e
        for (let s = 0; s <= 8; s++) {
          let n = new URL(r)
          if (!yo(n))
            throw new Error(
              n.protocol !== "https:"
                ? `[189Cloud] \u767B\u5F55\u91CD\u5B9A\u5411\u5FC5\u987B\u4F7F\u7528 HTTPS: ${n.origin}`
                : `[189Cloud] \u4E0D\u53D7\u4FE1\u4EFB\u7684\u767B\u5F55\u91CD\u5B9A\u5411\u5730\u5740: ${n.origin}`,
            )
          let o = { ...t }
          ;(s > 0 && (o.Referer = r), this.cookie && (o.Cookie = this.cookie))
          let a = await fetch(r, {
            method: "GET",
            headers: o,
            redirect: "manual",
          })
          await this.updateCookie(a.headers)
          let c = a.headers.get("location")
          if (!(a.status >= 300 && a.status < 400) || !c) {
            let u = r
            if (a.url && a.url !== r) {
              let p = new URL(a.url, r)
              if (au(p.toString()) || wo(p.toString())) {
                if (!yo(p))
                  throw new Error(
                    p.protocol !== "https:"
                      ? `[189Cloud] \u767B\u5F55\u91CD\u5B9A\u5411\u5FC5\u987B\u4F7F\u7528 HTTPS: ${p.origin}`
                      : `[189Cloud] \u4E0D\u53D7\u4FE1\u4EFB\u7684\u767B\u5F55\u91CD\u5B9A\u5411\u5730\u5740: ${p.origin}`,
                  )
                u = p.toString()
              }
            }
            return { response: a, url: u }
          }
          if (s === 8)
            throw new Error(
              "[189Cloud] \u767B\u5F55\u91CD\u5B9A\u5411\u6B21\u6570\u8FC7\u591A",
            )
          let l = new URL(c, r)
          if (!yo(l))
            throw new Error(
              l.protocol !== "https:"
                ? `[189Cloud] \u767B\u5F55\u91CD\u5B9A\u5411\u5FC5\u987B\u4F7F\u7528 HTTPS: ${l.origin}`
                : `[189Cloud] \u4E0D\u53D7\u4FE1\u4EFB\u7684\u767B\u5F55\u91CD\u5B9A\u5411\u5730\u5740: ${l.origin}`,
            )
          r = l.toString()
        }
        throw new Error("[189Cloud] \u767B\u5F55\u91CD\u5B9A\u5411\u5931\u8D25")
      }
      async resolveLoginUrl(e, t) {
        let r = e
        for (let s = 0; s < 3; s++) {
          let n = new URL(e)
          n.searchParams.set("noCache", mo())
          let o = await this.followRedirectsWithCookies(n.toString(), t)
          if (((r = o.url), au(o.url) || wo(o.url))) return o.url
          s < 2 && (await new Promise((a) => setTimeout(a, 150 * (s + 1))))
        }
        return r
      }
      async login(e = {}) {
        if (this.cookie && !e.force) return
        let t =
            "https://cloud.189.cn/api/portal/loginUrl.action?redirectURL=https%3A%2F%2Fcloud.189.cn%2Fmain.action",
          r = {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Referer: "https://cloud.189.cn/",
          }
        this.cookie && (r.Cookie = this.cookie)
        let s = await this.resolveLoginUrl(t, r)
        if (wo(s)) return
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
              "Content-Type":
                "application/x-www-form-urlencoded; charset=UTF-8",
              Accept: "application/json;charset=UTF-8",
            }
            return (this.cookie && (_.Cookie = this.cookie), _)
          },
          l = await fetch(
            "https://open.e.189.cn/api/logbox/oauth2/appConf.do",
            {
              method: "POST",
              headers: d(),
              body: new URLSearchParams({ version: "2.0", appKey: c }),
            },
          )
        await this.updateCookie(l.headers)
        let u = await l.json()
        if (u.result !== "0" || !u.data)
          throw new Error(
            `[189Cloud] \u83B7\u53D6 AppConf \u5931\u8D25: ${u.msg || JSON.stringify(u)}`,
          )
        let p = await fetch(
          "https://open.e.189.cn/api/logbox/config/encryptConf.do",
          {
            method: "POST",
            headers: d(),
            body: new URLSearchParams({ appId: c }),
          },
        )
        await this.updateCookie(p.headers)
        let h = await p.json()
        if (h.result !== 0 || !h.data?.pubKey)
          throw new Error(
            `[189Cloud] \u83B7\u53D6 EncryptConf \u5931\u8D25: ${JSON.stringify(h)}`,
          )
        let f = h.data.pre || "",
          g = h.data.pubKey,
          w = f + Cs(this.addition.username, g, !0),
          m = f + Cs(this.addition.password, g, !0),
          y = {
            version: "v2.0",
            apToken: "",
            appKey: c,
            accountType: u.data.accountType || "01",
            userName: w,
            epd: m,
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
            {
              method: "POST",
              headers: { ...d() },
              body: new URLSearchParams(y),
            },
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
        let r = t.method || "GET",
          s = t.retryOnInvalidSession !== !1,
          n = new URL(e)
        if ((n.searchParams.set("noCache", mo()), t.params))
          for (let [p, h] of Object.entries(t.params))
            h !== void 0 && n.searchParams.set(p, h)
        let o = {
          Accept: "application/json;charset=UTF-8",
          Referer: "https://cloud.189.cn/",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
        this.cookie && (o.Cookie = this.cookie)
        let a
        t.body &&
          ((o["Content-Type"] =
            "application/x-www-form-urlencoded; charset=UTF-8"),
          (a = new URLSearchParams(t.body).toString()))
        let c = await fetch(n.toString(), { method: r, headers: o, body: a })
        await this.updateCookie(c.headers)
        let d = await c.text(),
          l
        try {
          l = ou(d)
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
      async getFilesPage(e, t, r) {
        let s = this.addition.order_by || "lastOpTime",
          n =
            (this.addition.order_direction || "desc") === "desc"
              ? "true"
              : "false",
          o = await this.request(
            "https://cloud.189.cn/api/open/file/listFiles.action",
            {
              method: "GET",
              params: {
                pageSize: r,
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
        let r = [],
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
            r.push(...d),
            (t?.findName &&
              ((t.findIsDir && l.some((u) => u.name === t.findName)) ||
                (!t.findIsDir && d.some((u) => u.name === t.findName)))) ||
              d.length + l.length < parseInt(o, 10))
          )
            break
          n++
        }
        return { files: r, folders: s }
      }
      async getDownloadUrl(e) {
        let t = await this.request(
            "https://cloud.189.cn/api/portal/getFileInfo.action",
            { method: "GET", params: { fileId: e } },
          ),
          r = t.fileDownloadUrl || t.downloadUrl
        if (!r)
          throw new Error(
            `[189Cloud] \u83B7\u53D6\u6587\u4EF6\u4E0B\u8F7D\u5730\u5740\u5931\u8D25 (fileId: ${e})`,
          )
        let s = r.startsWith("//") ? "https:" + r : r
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
          r = String(e.pkId || "")
        if (!t || !r)
          throw new Error(
            "[189Cloud] \u83B7\u53D6\u4E0A\u4F20 RSA \u516C\u94A5\u5931\u8D25",
          )
        return (
          (this.rsa = {
            pubKey: t,
            pkId: r,
            expire: Number(e.expire) || Date.now() + 5 * 6e4,
          }),
          this.rsa
        )
      }
      async uploadRequest(e, t) {
        this.sessionKey || (this.sessionKey = await this.getSessionKey())
        let r = String(Date.now()),
          s = fo(),
          n = fo("xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx").slice(
            0,
            16 + Math.floor(Math.random() * 17),
          ),
          o = Object.keys(t)
            .sort()
            .map((g) => `${g}=${t[g]}`)
            .join("&"),
          a = ru(o, n.slice(0, 16)),
          c = iu(
            `SessionKey=${this.sessionKey}&Operate=GET&RequestURI=${e}&Date=${r}&params=${a}`,
            n,
          ),
          { pubKey: d, pkId: l } = await this.getResKey(),
          u = {
            accept: "application/json;charset=UTF-8",
            SessionKey: this.sessionKey,
            Signature: c,
            "X-Request-Date": r,
            "X-Request-ID": s,
            EncryptionText: Cs(n, d, !1),
            PkId: l,
          }
        this.cookie && (u.Cookie = this.cookie)
        let p = await fetch(`https://upload.cloud.189.cn${e}?params=${a}`, {
          method: "GET",
          headers: u,
        })
        await this.updateCookie(p.headers)
        let h = await p.text()
        if (!p.ok)
          throw new Error(
            `[189Cloud] \u4E0A\u4F20\u63A5\u53E3 HTTP ${p.status}: ${h.slice(0, 200)}`,
          )
        let f
        try {
          f = ou(h)
        } catch {
          throw new Error(
            `[189Cloud] \u4E0A\u4F20\u63A5\u53E3\u8FD4\u56DE\u65E0\u6548\u54CD\u5E94: ${h.slice(0, 200)}`,
          )
        }
        if (f.code !== "SUCCESS")
          throw new Error(
            f.msg ||
              f.message ||
              `[189Cloud] \u4E0A\u4F20\u63A5\u53E3\u5931\u8D25: ${e}`,
          )
        return f
      }
      async createMultiUpload(e, t, r, s) {
        let n = await this.getSessionKey()
        this.sessionKey = n
        let o = {
            parentFolderId: e,
            fileName: encodeURIComponent(t).replace(/%20/g, "+"),
            fileSize: String(r),
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
      async getMultiUploadUrls(e, t, r) {
        let n = (
          await this.uploadRequest("/person/getMultiUploadUrls", {
            partInfo: `${t}-${nu(r)}`,
            uploadFileId: e,
          })
        ).uploadUrls?.[`partNumber_${t}`]
        if (!n?.requestURL)
          throw new Error(
            `[189Cloud] \u83B7\u53D6\u7B2C ${t} \u4E2A\u5206\u7247\u4E0A\u4F20\u5730\u5740\u5931\u8D25`,
          )
        return n
      }
      async commitMultiUpload(e, t, r) {
        await this.uploadRequest("/person/commitMultiUploadFile", {
          uploadFileId: e,
          fileMd5: t,
          sliceMd5: r,
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
      async rename(e, t, r) {
        let s = t
            ? "https://cloud.189.cn/api/open/file/renameFolder.action"
            : "https://cloud.189.cn/api/open/file/renameFile.action",
          n = t
            ? { folderId: e, destFolderName: r }
            : { fileId: e, destFileName: r }
        await this.request(s, { method: "POST", body: n })
      }
      async batchTask(e, t, r = "") {
        let s = t.map((n) => ({
          fileId: n.id,
          fileName: n.name,
          isFolder: n.isFolder ? 1 : 0,
        }))
        await this.request(
          "https://cloud.189.cn/api/open/batch/createBatchTask.action",
          {
            method: "POST",
            body: { type: e, targetFolderId: r, taskInfos: JSON.stringify(s) },
          },
        )
      }
      async move(e, t, r, s) {
        await this.batchTask("MOVE", [{ id: e, name: r, isFolder: t }], s)
      }
      async copy(e, t, r, s) {
        await this.batchTask("COPY", [{ id: e, name: r, isFolder: t }], s)
      }
      async remove(e, t, r) {
        await this.batchTask("DELETE", [{ id: e, name: r, isFolder: t }], "")
      }
      async getCapacityInfo() {
        return this.request(
          "https://cloud.189.cn/api/portal/getUserSizeInfo.action",
          { method: "GET" },
        )
      }
    }
  })
function bm(i) {
  return Buffer.from(JSON.stringify(i), "utf8").toString("base64")
}
function du(i) {
  try {
    let e = JSON.parse(Buffer.from(i, "base64").toString("utf8"))
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
function pu(i) {
  if (!i) return new Date().toISOString()
  try {
    let e = new Date(i)
    if (!isNaN(e.getTime())) return e.toISOString()
  } catch {}
  return new Date().toISOString()
}
function lu(i) {
  return {
    name: i.name,
    size: 0,
    is_dir: !0,
    modified: pu(i.lastOpTime),
    sign: String(i.id),
    type: 1,
    thumb: "",
    raw_url: "",
  }
}
function uu(i) {
  return {
    name: i.name,
    size: i.size || 0,
    is_dir: !1,
    modified: pu(i.lastOpTime),
    sign: String(i.id),
    type: z(i.name, !1),
    thumb: i.icon?.smallUrl || i.icon?.largeUrl || "",
    raw_url: "",
  }
}
function km(i) {
  let e = { ...(i || {}) }
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
var _m,
  vm,
  Es,
  hu = R(() => {
    "use strict"
    ee()
    ie()
    cu()
    go()
    ;((_m = 45), (vm = 10 * 1024 * 1024))
    Es = class {
      client
      addition
      pathIdCache = new Map()
      budget = { used: 0, limit: _m }
      constructor(e, t) {
        ;((this.addition = km(e)), (this.client = new Ds(this.addition, t)))
      }
      async init() {
        await this.client.login()
      }
      consumePendingCookie() {
        return this.client.consumePendingCookie()
      }
      async resolveFolderId(e) {
        let t = this.client.getRootId(),
          r =
            "/" +
            String(e || "")
              .split("/")
              .filter(Boolean)
              .join("/")
        if (r === "/" || r === `/${t}`) return t
        let s = r.split("/").filter(Boolean),
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
            p = u.find(
              (h) =>
                h.name === d ||
                h.name === l ||
                String(h.id) === d ||
                String(h.id) === l,
            )
          if (!p)
            throw new Error(`[189Cloud] \u76EE\u5F55\u672A\u627E\u5230: ${d}`)
          ;((o = String(p.id)),
            (a = "/" + s.slice(0, c + 1).join("/")),
            this.pathIdCache.set(a, o))
        }
        return o
      }
      async resolveFile(e) {
        let t = String(e || "")
          .split("/")
          .filter(Boolean)
        if (t.length === 0)
          throw new Error("[189Cloud] \u8DEF\u5F84\u65E0\u6548")
        let r = t[t.length - 1],
          s = (() => {
            try {
              return decodeURIComponent(r)
            } catch {
              return r
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
              u.name === r ||
              u.name === s ||
              String(u.id) === r ||
              String(u.id) === s,
          )
        if (d) return { file: d, parentId: o, isDir: !1 }
        let l = c.find(
          (u) =>
            u.name === r ||
            u.name === s ||
            String(u.id) === r ||
            String(u.id) === s,
        )
        if (l) return { file: l, parentId: o, isDir: !0 }
        throw new Error(
          `[189Cloud] \u6587\u4EF6\u6216\u76EE\u5F55\u672A\u627E\u5230: ${r}`,
        )
      }
      async list(e, t) {
        this.budget.used = 0
        let r = await this.resolveFolderId(t),
          { files: s, folders: n } = await this.client.getFiles(r, {
            budget: this.budget,
          }),
          o = [...n.map(lu), ...s.map(uu)]
        return N(
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
        let r = String(t || "")
          .split("/")
          .filter(Boolean)
        if (r.length === 0 || r[r.length - 1] === this.client.getRootId()) {
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
        if (n) return lu(s)
        let o = uu(s)
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
        let r = String(t || "")
            .split("/")
            .filter(Boolean),
          s = r.pop() || "\u65B0\u6587\u4EF6\u5939",
          n = "/" + r.join("/"),
          o = await this.resolveFolderId(n)
        await this.client.mkdir(o, s)
      }
      async rename(e, t, r) {
        this.budget.used = 0
        let { file: s, isDir: n } = await this.resolveFile(t)
        await this.client.rename(String(s.id), n, r)
      }
      async remove(e, t, r) {
        this.budget.used = 0
        let { file: s, isDir: n } = await this.resolveFile(t)
        await this.client.remove(String(s.id), n, s.name)
      }
      async move(e, t, r, s, n) {
        this.budget.used = 0
        let { file: o, isDir: a } = await this.resolveFile(s),
          c = String(t).split("/").filter(Boolean),
          d = await this.resolveFolderId("/" + c.join("/"))
        await this.client.move(String(o.id), a, o.name, d)
      }
      async copy(e, t, r, s, n) {
        this.budget.used = 0
        let { file: o, isDir: a } = await this.resolveFile(s),
          c = String(t).split("/").filter(Boolean),
          d = await this.resolveFolderId("/" + c.join("/"))
        await this.client.copy(String(o.id), a, o.name, d)
      }
      async put(e, t, r) {
        let s = String(t || "")
            .split("/")
            .filter(Boolean),
          n = s.pop()
        if (!n)
          throw new Error("[189Cloud] \u4E0A\u4F20\u8DEF\u5F84\u65E0\u6548")
        let o = "/" + s.join("/"),
          a = await this.createUploadSession(o, o, n, r.length, Ts(r))
        if (a.reuse) return
        let c = []
        for (let d = 1; d <= a.partCount; d++) {
          let l = (d - 1) * a.chunkSize,
            u = r.subarray(l, Math.min(l + a.chunkSize, r.length)),
            p = await this.uploadPart(a.session, d, u)
          c.push(p.partMd5)
        }
        await this.completeUploadSession(a.session, c)
      }
      async createUploadSession(e, t, r, s, n) {
        let o = vm,
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
            r,
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
              session: bm({
                uploadFileId: l.uploadFileId,
                sessionKey: l.sessionKey,
                fileMd5: a,
                size: Math.max(0, Number(s) || 0),
                partCount: c,
                chunkSize: o,
              }),
            }
      }
      async uploadPart(e, t, r) {
        let s = du(e)
        if (!Number.isInteger(t) || t < 1 || t > s.partCount)
          throw new Error(
            `[189Cloud] \u5206\u7247\u5E8F\u53F7\u65E0\u6548: ${t}`,
          )
        this.client.setSessionKey(s.sessionKey)
        let n = await this.client.getMultiUploadUrls(s.uploadFileId, t, r),
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
        let a = await fetch(n.requestURL, {
          method: "PUT",
          headers: o,
          body: r,
        })
        if (!a.ok) {
          let c = await a.text().catch(() => "")
          throw new Error(
            `[189Cloud] \u4E0A\u4F20\u7B2C ${t}/${s.partCount} \u5206\u7247\u5931\u8D25: HTTP ${a.status} ${c}`,
          )
        }
        return { partMd5: Ts(r) }
      }
      async completeUploadSession(e, t = []) {
        let r = du(e)
        this.client.setSessionKey(r.sessionKey)
        let s = t
          .map((o) =>
            String(o || "")
              .trim()
              .toLowerCase(),
          )
          .filter((o) => /^[a-f0-9]{32}$/.test(o))
        if (s.length !== r.partCount)
          throw new Error(
            "[189Cloud] \u5206\u7247\u6821\u9A8C\u4FE1\u606F\u4E0D\u5B8C\u6574\uFF0C\u65E0\u6CD5\u63D0\u4EA4\u4E0A\u4F20",
          )
        let n =
          r.partCount === 1
            ? r.fileMd5
            : Ts(
                s.join(`
`),
              ).toUpperCase()
        await this.client.commitMultiUpload(r.uploadFileId, r.fileMd5, n)
      }
    }
  })
function it(i, e) {
  let t = i.replace(/\/+$/, ""),
    r = e.replace(/^\/+/, "")
  return !t && !r ? "/" : t ? (r ? `${t}/${r}` : t) : "/" + r
}
function Pm(i) {
  return i
    .split("/")
    .map((e) => encodeURIComponent(e))
    .join("/")
}
function fu(i, e) {
  let t = [],
    r,
    s =
      /<(?:[a-zA-Z0-9_-]+:)?response\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?response>/gi,
    n
  for (; (n = s.exec(i)) !== null; ) {
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
      p = ""
    for (; (u = l.exec(o)) !== null; ) {
      let T = u[1],
        O =
          /<(?:[a-zA-Z0-9_-]+:)?status\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?status>/i.exec(
            T,
          ),
        q = O ? O[1] : ""
      if (q.includes("200") || q.toLowerCase().includes("ok")) {
        let L =
          /<(?:[a-zA-Z0-9_-]+:)?prop\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?prop>/i.exec(
            T,
          )
        if (L) {
          p = L[1]
          break
        }
      }
    }
    if (!p) continue
    let h =
        /<(?:[a-zA-Z0-9_-]+:)?resourcetype\b[^>]*>[\s\S]*?<(?:[a-zA-Z0-9_-]+:)?collection\b/i.test(
          p,
        ),
      f =
        /<(?:[a-zA-Z0-9_-]+:)?displayname\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?displayname>/i.exec(
          p,
        ),
      g = f ? f[1].trim() : "",
      w = d.replace(/\/+$/, ""),
      m = (w && w.split("/").pop()) || "",
      y = g || m,
      v =
        /<(?:[a-zA-Z0-9_-]+:)?getcontentlength\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?getcontentlength>/i.exec(
          p,
        ),
      x = h ? 0 : (v && parseInt(v[1].trim(), 10)) || 0,
      _ =
        /<(?:[a-zA-Z0-9_-]+:)?getlastmodified\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?getlastmodified>/i.exec(
          p,
        ),
      b = new Date().toISOString()
    if (_) {
      let T = new Date(_[1].trim())
      isNaN(T.getTime()) || (b = T.toISOString())
    }
    let P =
        /<(?:[a-zA-Z0-9_-]+:)?getcontenttype\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?getcontenttype>/i.exec(
          p,
        ),
      A = P ? P[1].trim() : void 0,
      C =
        /<(?:[a-zA-Z0-9_-]+:)?getetag\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?getetag>/i.exec(
          p,
        ),
      S = C ? C[1].trim().replace(/^"|"$/g, "") : void 0,
      k = {
        name: y,
        path: d,
        size: x,
        modified: b,
        isFolder: h,
        contentType: A,
        etag: S,
      },
      D = e.replace(/\/+$/, "").toLowerCase(),
      F = w.toLowerCase()
    !r && (F === D || F.endsWith(D) || (D === "" && F === ""))
      ? (r = k)
      : t.push(k)
  }
  return { self: r, items: t }
}
function Sm(i) {
  let e = {},
    t = i.replace(/^digest\s+/i, "").split(/,\s*/)
  for (let r of t) {
    let s = r.indexOf("=")
    if (s !== -1) {
      let n = r.slice(0, s).trim(),
        o = r
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
function mu(i, e, t, r, s, n = 1) {
  let o = n.toString(16).padStart(8, "0"),
    a = Math.random().toString(36).substring(2, 18),
    c = i.realm || "",
    d = i.nonce || "",
    l = (i.algorithm || "MD5").toUpperCase(),
    u = i.qop || "",
    p = ""
  if (l === "MD5" || l === "") p = It.default.MD5(`${e}:${c}:${t}`).toString()
  else if (l === "MD5-SESS") {
    let w = It.default.MD5(`${e}:${c}:${t}`).toString()
    p = It.default.MD5(`${w}:${d}:${a}`).toString()
  }
  let h = ""
  ;(u === "auth" || u === "") && (h = It.default.MD5(`${r}:${s}`).toString())
  let f = ""
  u
    ? (f = It.default.MD5(`${p}:${d}:${o}:${a}:${u}:${h}`).toString())
    : (f = It.default.MD5(`${p}:${d}:${h}`).toString())
  let g = `Digest username="${e}", realm="${c}", nonce="${d}", uri="${s}", response="${f}"`
  return (
    l && (g += `, algorithm=${l}`),
    u && (g += `, qop=${u}, nc=${o}, cnonce="${a}"`),
    i.opaque && (g += `, opaque="${i.opaque}"`),
    g
  )
}
async function Cm(i, e, t) {
  let r = new URL(t),
    s = r.hostname.split("."),
    n = s[s.length - 1],
    a = `${Am[n] || "https://login.microsoftonline.com"}/extSTS.srf`,
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
  <o:Username>${i.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</o:Username>
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
  let p = u[1].trim(),
    h = `https://${r.host}/_forms/default.aspx?wa=wsignin1.0`,
    f = await fetch(h, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: p,
      redirect: "manual",
    }),
    g = "",
    w = "",
    m = (y) => {
      let v = []
      if (y.headers.getSetCookie) v.push(...y.headers.getSetCookie())
      else {
        let x = y.headers.get("set-cookie")
        x && v.push(x)
      }
      for (let x of v) {
        let _ = /rtFa=([^;]+)/.exec(x)
        _ && (g = _[1])
        let b = /FedAuth=([^;]+)/.exec(x)
        b && (w = b[1])
      }
    }
  if ((m(f), !g || !w)) {
    let y = f.headers.get("location")
    if (y) {
      let v = new URL(y, h).toString(),
        x = await fetch(v, {
          method: "GET",
          headers: { Cookie: `rtFa=${g}; FedAuth=${w}` },
          redirect: "manual",
        })
      m(x)
    }
  }
  if (!g && !w)
    throw new Error(
      "SharePoint auth failed: rtFa / FedAuth cookies not returned",
    )
  return `rtFa=${g}; FedAuth=${w}`
}
var It,
  Am,
  Fs,
  gu = R(() => {
    "use strict"
    It = yr(Ur(), 1)
    Am = {
      com: "https://login.microsoftonline.com",
      cn: "https://login.chinacloudapi.cn",
      us: "https://login.microsoftonline.us",
      de: "https://login.microsoftonline.de",
    }
    Fs = class {
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
          (this.sharepointCookie = await Cm(
            this.username,
            this.password,
            this.address,
          ))
      }
      buildUrl(e) {
        let t = e.replace(/^\/+/, "")
        return t ? `${this.address}/${Pm(t)}` : this.address
      }
      getAuthHeaders(e, t) {
        let r = {}
        if (this.isSharepoint && this.sharepointCookie)
          r.Cookie = this.sharepointCookie
        else if (this.digestParts)
          (this.ncCount++,
            (r.Authorization = mu(
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
          r.Authorization = `Basic ${s}`
        }
        return r
      }
      async request(e, t, r = {}) {
        let s = this.buildUrl(t),
          n = new URL(s),
          o = n.pathname + n.search,
          c = { ...this.getAuthHeaders(e, o), ...(r.headers || {}) },
          d = await fetch(s, {
            method: e,
            headers: c,
            body: r.body,
            redirect: r.redirect || "follow",
          })
        if (d.status === 401 && !this.isSharepoint) {
          let l = d.headers.get("www-authenticate") || ""
          if (/digest/i.test(l)) {
            ;((this.digestParts = Sm(l)), (this.ncCount = 1))
            let u = mu(
                this.digestParts,
                this.username,
                this.password,
                e,
                o,
                this.ncCount,
              ),
              p = { ...c, Authorization: u }
            d = await fetch(s, {
              method: e,
              headers: p,
              body: r.body,
              redirect: r.redirect || "follow",
            })
          }
        }
        return d
      }
      async readDir(e) {
        let r = await this.request("PROPFIND", e, {
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
        if (r.status === 404) throw new Error(`Directory not found: ${e}`)
        if (r.status !== 207 && !r.ok) {
          let o = await r.text()
          throw new Error(
            `WebDAV PROPFIND failed with status ${r.status}: ${o || r.statusText}`,
          )
        }
        let s = await r.text(),
          { items: n } = fu(s, e)
        return n
      }
      async stat(e) {
        let r = await this.request("PROPFIND", e, {
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
        if (r.status === 404) throw new Error(`Object not found: ${e}`)
        if (r.status !== 207 && !r.ok) {
          let c = await r.text()
          throw new Error(
            `WebDAV PROPFIND failed with status ${r.status}: ${c || r.statusText}`,
          )
        }
        let s = await r.text(),
          { self: n, items: o } = fu(s, e),
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
            let r = e.split("/").filter(Boolean),
              s = ""
            for (let n of r) {
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
      async move(e, t, r = !0) {
        let s = this.buildUrl(t),
          n = await this.request("MOVE", e, {
            headers: { Destination: s, Overwrite: r ? "T" : "F" },
          })
        if (!(n.status === 201 || n.status === 204)) {
          if (n.status === 409) {
            let o = t.substring(0, t.lastIndexOf("/"))
            if (o) return (await this.mkdirAll(o), this.move(e, t, r))
          }
          throw new Error(`WebDAV MOVE failed with status ${n.status}`)
        }
      }
      async copy(e, t, r = !0) {
        let s = this.buildUrl(t),
          n = await this.request("COPY", e, {
            headers: { Destination: s, Overwrite: r ? "T" : "F" },
          })
        if (!(n.status === 201 || n.status === 204)) {
          if (n.status === 409) {
            let o = t.substring(0, t.lastIndexOf("/"))
            if (o) return (await this.mkdirAll(o), this.copy(e, t, r))
          }
          throw new Error(`WebDAV COPY failed with status ${n.status}`)
        }
      }
      async remove(e) {
        let t = await this.request("DELETE", e)
        if (!(t.status === 200 || t.status === 204 || t.status === 404))
          throw new Error(`WebDAV DELETE failed with status ${t.status}`)
      }
      async put(e, t, r) {
        let s = {}
        r && (s["Content-Type"] = r)
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
          r = new URL(t),
          s = r.pathname + r.search,
          n = this.getAuthHeaders("GET", s)
        return { url: t, headers: n }
      }
    }
  })
function Tm(i) {
  let e = { ...(i || {}) }
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
var Is,
  yu = R(() => {
    "use strict"
    ee()
    ie()
    gu()
    Is = class {
      client
      addition
      constructor(e) {
        ;((this.addition = Tm(e)), (this.client = new Fs(this.addition)))
      }
      async init() {
        await this.client.init()
      }
      getRemotePath(e) {
        let t = this.addition.root_folder_path || "/"
        return it(t, e || "/")
      }
      fileItemFromWebdav(e, t) {
        let r = this.client.getLink(t)
        return {
          name: e.name,
          size: e.size,
          is_dir: e.isFolder,
          modified: e.modified,
          sign: e.path || t,
          type: z(e.name, e.isFolder),
          thumb: "",
          raw_url: e.isFolder ? void 0 : r.url,
          raw_url_headers: e.isFolder ? void 0 : r.headers,
        }
      }
      async list(e, t) {
        let r = this.getRemotePath(t),
          n = (await this.client.readDir(r)).map((o) => {
            let a = it(r, o.name)
            return this.fileItemFromWebdav(o, a)
          })
        return N(
          n,
          this.addition.order_by || "name",
          this.addition.order_direction || "asc",
        )
      }
      async get(e, t) {
        let r = this.getRemotePath(t),
          s = await this.client.stat(r)
        return this.fileItemFromWebdav(s, r)
      }
      async mkdir(e, t) {
        let r = this.getRemotePath(t)
        await this.client.mkdirAll(r)
      }
      async rename(e, t, r) {
        let s = this.getRemotePath(t),
          n = s.lastIndexOf("/"),
          o = n >= 0 ? s.substring(0, n) : "/",
          a = it(o, r)
        await this.client.move(s, a, !0)
      }
      async move(e, t, r, s, n) {
        let o = this.getRemotePath(s),
          a = this.getRemotePath(n)
        for (let c of r) {
          let d = it(o, c),
            l = it(a, c)
          await this.client.move(d, l, !0)
        }
      }
      async copy(e, t, r, s, n) {
        let o = this.getRemotePath(s),
          a = this.getRemotePath(n)
        for (let c of r) {
          let d = it(o, c),
            l = it(a, c)
          await this.client.copy(d, l, !0)
        }
      }
      async remove(e, t, r) {
        let s = this.getRemotePath(t)
        if (r && r.length > 0)
          for (let n of r) {
            let o = it(s, n)
            await this.client.remove(o)
          }
        else await this.client.remove(s)
      }
      async put(e, t, r) {
        let s = this.getRemotePath(t)
        await this.client.put(s, r)
      }
    }
  })
var Ue,
  Rs,
  wu,
  xu,
  xo,
  _o,
  _t,
  vo,
  _u,
  vu,
  bu,
  ku,
  Pu,
  Su,
  Au,
  Cu,
  Tu,
  Du,
  Eu,
  Fu,
  Iu,
  Ru,
  Bu,
  bo,
  Bs = R(() => {
    "use strict"
    ;((Ue = "1001000021"),
      (Rs = "XFmi9GS2hzk98jGX"),
      (wu = "10000001"),
      (xu = "https://panservice.mail.wo.cn"),
      (xo = "https://tjupload.pan.wo.cn"),
      (_o =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.37"),
      (_t = "api-user"),
      (vo = "wohome"),
      (_u = "wocloud"),
      (vu = "AppQueryUser"),
      (bu = "AppRefreshToken"),
      (ku = "QueryCloudUsageInfo"),
      (Pu = "ClassifyRule"),
      (Su = "GetZoneInfo"),
      (Au = "FamilyUserCurrentEncode"),
      (Cu = "QueryAllFiles"),
      (Tu = "GetDownloadUrlV2"),
      (Du = "CreateDirectory"),
      (Eu = "RenameFileOrDirectory"),
      (Fu = "MoveFile"),
      (Iu = "CopyFile"),
      (Ru = "DeleteFile"),
      (Bu = "upload2C"),
      (bo = {
        name_asc: 1,
        name_desc: 2,
        size_asc: 3,
        size_desc: 4,
        time_asc: 5,
        time_desc: 6,
      }))
  })
var ke,
  Dm,
  Us,
  Uu = R(() => {
    "use strict"
    ke = yr(Ur(), 1)
    Bs()
    ;((Dm = "wNSOYIB1k1DjY5lA"),
      (Us = class {
        key = Rs
        iv = Dm
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
          let r = t === _t ? this.key : this.accessKey || this.key,
            s = ke.default.enc.Utf8.parse(r),
            n = ke.default.enc.Utf8.parse(this.iv)
          return ke.default.AES.encrypt(ke.default.enc.Utf8.parse(e), s, {
            iv: n,
            mode: ke.default.mode.CBC,
            padding: ke.default.pad.Pkcs7,
          }).toString()
        }
        decrypt(e, t) {
          let r = t === _t ? this.key : this.accessKey || this.key,
            s = ke.default.enc.Utf8.parse(r),
            n = ke.default.enc.Utf8.parse(this.iv)
          return ke.default.AES.decrypt(e, s, {
            iv: n,
            mode: ke.default.mode.CBC,
            padding: ke.default.pad.Pkcs7,
          }).toString(ke.default.enc.Utf8)
        }
        userEncrypt(e) {
          return this.encrypt(e, _t)
        }
        userDecrypt(e) {
          return this.decrypt(e, _t)
        }
        woHomeEncrypt(e) {
          return this.encrypt(e, "wohome")
        }
        woHomeDecrypt(e) {
          return this.decrypt(e, "wohome")
        }
        calHeader(e, t) {
          let r = Date.now(),
            s = Math.floor(Math.random() * 8999) + 1e5,
            n = "",
            o = ke.default.MD5(`${t}${r}${s}${e}${n}`).toString()
          return {
            key: t,
            resTime: r,
            reqSeq: s,
            channel: e,
            sign: o,
            version: n,
          }
        }
      }))
  })
function Em(i) {
  let e = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    t = ""
  for (let r = 0; r < i; r++)
    t += e.charAt(Math.floor(Math.random() * e.length))
  return t
}
function Fm(i = new Date()) {
  let e = (c) => String(c).padStart(2, "0"),
    t = i.getFullYear(),
    r = e(i.getMonth() + 1),
    s = e(i.getDate()),
    n = e(i.getHours()),
    o = e(i.getMinutes()),
    a = e(i.getSeconds())
  return `${t}${r}${s}${n}${o}${a}`
}
var $s,
  $u = R(() => {
    "use strict"
    Bs()
    Uu()
    $s = class {
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
          (this.crypto = new Us(this.accessToken)))
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
      async request(e, t, r, s = {}, n = !0) {
        let o = this.crypto.calHeader(e, t),
          a = { ...s }
        if (r != null) {
          let f = JSON.stringify(r),
            g = this.crypto.encrypt(f, e)
          a.param = g
        }
        let c = {
          Origin: "https://pan.wo.cn",
          Referer: "https://pan.wo.cn/",
          "User-Agent": _o,
          "Content-Type": "application/json;charset=UTF-8",
        }
        this.accessToken && (c.Accesstoken = this.accessToken)
        let d = `${xu}/${e}/dispatcher`,
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
        let p = u.RSP?.RSP_CODE
        if (p !== "0000") {
          if (e !== _t && n && p === "9999")
            return (await this.refreshToken(), this.request(e, t, r, s, !1))
          throw new Error(
            `[WoPan] Request failed with rsp_code: ${p}, rsp_desc: ${u.RSP?.RSP_DESC || ""}`,
          )
        }
        let h = u.RSP?.DATA
        if (h == null) return {}
        if (typeof h == "string") {
          let f = h.trim()
          f.startsWith('"') && f.endsWith('"') && (f = f.slice(1, -1))
          try {
            let g = this.crypto.decrypt(f, e)
            if (g) return JSON.parse(g)
          } catch {
            try {
              return JSON.parse(f)
            } catch {
              return f
            }
          }
        }
        return h
      }
      async requestApiUser(e, t, r = {}) {
        return this.request(_t, e, t, r)
      }
      async requestWoHome(e, t, r = {}) {
        return this.request(vo, e, t, r)
      }
      async appRefreshToken() {
        return await this.requestApiUser(
          bu,
          { refreshToken: this.refreshTokenValue, clientSecret: Rs },
          { clientId: Ue, secret: !0 },
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
          vu,
          { accessToken: this.accessToken },
          { clientId: Ue, secret: !0 },
        )
      }
      async initPhone() {
        if (this.phone) return
        let e = await this.appQueryUser()
        e?.userId && (this.phone = e.userId)
      }
      async classifyRule() {
        return this.requestWoHome(Pu, {}, { key: !0 })
      }
      async initClassifyRule() {
        if (this.classifyRuleData) return
        let e = await this.classifyRule().catch(() => null)
        e && (this.classifyRuleData = e)
      }
      async getZoneInfo() {
        return this.requestWoHome(Su, { appId: wu }, { key: !0 })
      }
      async initZoneURL() {
        if (this.zoneURL) return
        let e = await this.getZoneInfo().catch(() => null)
        this.zoneURL = e?.url || xo
      }
      async familyUserCurrentEncode() {
        return this.requestWoHome(Au, { clientId: Ue }, { secret: !0 })
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
      async queryAllFiles(e, t, r, s, n, o = "") {
        let a = {
          spaceType: e,
          parentDirectoryId: t,
          pageNum: r,
          pageSize: s,
          sortRule: n,
          clientId: Ue,
        }
        return (
          e === "1" && o && (a.familyId = o),
          this.requestWoHome(Cu, a, { secret: !0 })
        )
      }
      async getDownloadUrlV2(e) {
        let t = { type: "1", fidList: e, clientId: Ue }
        return this.requestWoHome(Tu, t, { secret: !0 })
      }
      async createDirectory(e, t, r, s = "") {
        let n = {
          spaceType: e,
          familyId: s,
          parentDirectoryId: t,
          directoryName: r,
          clientId: Ue,
        }
        return this.requestWoHome(Du, n, { secret: !0 })
      }
      async renameFileOrDirectory(e, t, r, s, n = "") {
        let o = t === 0 ? "0" : this.getFileType(s),
          a = {
            spaceType: e,
            type: t,
            fileType: o,
            id: r,
            name: s,
            clientId: Ue,
          }
        ;(e === "1" && n && (a.familyId = n),
          await this.requestWoHome(Eu, a, { secret: !0 }))
      }
      async moveFile(e, t, r, s, n, o = "", a = "") {
        let c = {
          targetDirId: r,
          sourceType: s,
          targetType: n,
          dirList: e,
          fileList: t,
          secret: !1,
          clientId: Ue,
        }
        ;(s === "1" && o && (c.fromFamilyId = o),
          n === "1" && a && (c.familyId = a),
          await this.requestWoHome(Fu, c, { secret: !0 }))
      }
      async copyFile(e, t, r, s, n, o = "", a = "") {
        let c = {
          targetDirId: r,
          sourceType: s,
          targetType: n,
          dirList: e,
          fileList: t,
          secret: !1,
          clientId: Ue,
        }
        ;(s === "1" && o && (c.fromFamilyId = o),
          n === "1" && a && (c.familyId = a),
          await this.requestWoHome(Iu, c, { secret: !0 }))
      }
      async deleteFile(e, t, r) {
        let s = {
          spaceType: e,
          vipLevel: "0",
          dirList: t,
          fileList: r,
          clientId: Ue,
        }
        await this.requestWoHome(Ru, s, { secret: !0 })
      }
      async queryCloudUsageInfo() {
        return (
          await this.initPhone(),
          this.requestWoHome(
            ku,
            { phoneNum: this.phone, clientId: Ue },
            { secret: !0 },
          )
        )
      }
      async upload2C(e, t, r, s, n = "", o) {
        await this.initZoneURL()
        let c = `${this.zoneURL || xo}/openapi/client/${Bu}`,
          d =
            r instanceof Uint8Array
              ? r
              : r instanceof ArrayBuffer
                ? new Uint8Array(r)
                : new Uint8Array(r),
          l = d.length,
          u = Math.max(1, Math.ceil(l / 8388608)),
          p = Fm(),
          h = {
            spaceType: e,
            directoryId: s,
            batchNo: p,
            fileName: t,
            fileSize: l,
            fileType: this.getFileType(t),
          }
        e === "1" && n && (h.familyId = n)
        let f = this.crypto.encrypt(JSON.stringify(h), vo),
          g = `${Date.now()}_${Em(6)}`,
          w = 0,
          m = ""
        for (let y = 1; y <= u; y++) {
          let v = (y - 1) * 8388608,
            x = y === u ? l - v : 8388608,
            _ = d.subarray(v, v + x),
            b = new FormData()
          ;(b.append("uniqueId", g),
            b.append("accessToken", this.accessToken),
            b.append("fileName", t),
            b.append("psToken", "undefined"),
            b.append("fileSize", String(l)),
            b.append("totalPart", String(u)),
            b.append("channel", _u),
            b.append("directoryId", s),
            b.append("fileInfo", f),
            b.append("partSize", String(x)),
            b.append("partIndex", String(y)))
          let P = new Blob(
            [_.buffer.slice(_.byteOffset, _.byteOffset + _.byteLength)],
            { type: "application/octet-stream" },
          )
          b.append("file", P, t)
          let A = await fetch(c, {
            method: "POST",
            headers: {
              Origin: "https://pan.wo.cn",
              Referer: "https://pan.wo.cn/",
              "User-Agent": _o,
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
          ;(C.data?.fid && (m = C.data.fid), (w += x), o?.(w, l))
        }
        return m
      }
    }
  })
function Rm(i) {
  if (!i) return new Date().toISOString()
  if (i.length >= 14) {
    let e = i.slice(0, 4),
      t = i.slice(4, 6),
      r = i.slice(6, 8),
      s = i.slice(8, 10),
      n = i.slice(10, 12),
      o = i.slice(12, 14),
      a = `${e}-${t}-${r}T${s}:${n}:${o}+08:00`,
      c = new Date(a)
    if (!isNaN(c.getTime())) return c.toISOString()
  }
  try {
    let e = new Date(i)
    if (!isNaN(e.getTime())) return e.toISOString()
  } catch {}
  return new Date().toISOString()
}
function qu(i) {
  let e = i.type === 0
  return {
    name: i.name,
    size: i.size || 0,
    is_dir: e,
    modified: Rm(i.createTime),
    sign: i.fid || i.id,
    type: z(i.name, e),
    thumb: i.thumbUrl || "",
    raw_url: "",
  }
}
function Po(i) {
  let e = { ...(i || {}) }
  return (
    (e.root_folder_id = e.root_folder_id || "0"),
    (e.refresh_token = (e.refresh_token || "").trim()),
    (e.family_id = (e.family_id || "").trim()),
    (e.sort_rule = e.sort_rule || "name_asc"),
    (e.access_token = (e.access_token || "").trim()),
    e
  )
}
var qs,
  Ou = R(() => {
    "use strict"
    ee()
    ie()
    Bs()
    $u()
    qs = class {
      client
      addition
      defaultFamilyId = ""
      pathFileMapCache = new Map()
      pathFolderIdCache = new Map()
      constructor(e, t) {
        ;((this.addition = Po(e)),
          (this.client = new $s(this.addition, (r, s) => {
            ;((this.addition.access_token = r),
              (this.addition.refresh_token = s),
              t?.(r, s))
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
        return bo[e] || bo.name_asc
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
        let r = await this.resolveFolderId(t),
          s = await this.fetchFolderFiles(r),
          n = t.split("/").filter(Boolean).join("/")
        for (let a of s) {
          let c = n ? `${n}/${a.name}` : a.name
          ;(this.pathFileMapCache.set(c, a),
            a.type === 0 && this.pathFolderIdCache.set(c, a.id))
        }
        let o = s.map(qu)
        return N(o, this.addition.order_by, this.addition.order_direction)
      }
      async get(e, t) {
        let r = t.split("/").filter(Boolean).join("/")
        if (!r)
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
            let a = r.split("/")
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
        let n = qu(s)
        if (!n.is_dir && s.fid) {
          let o = await this.client.getDownloadUrlV2([s.fid]).catch(() => null)
          o?.list?.[0]?.downloadUrl && (n.raw_url = o.list[0].downloadUrl)
        }
        return n
      }
      async mkdir(e, t) {
        let r = t.split("/").filter(Boolean),
          s = r.pop() || "\u65B0\u6587\u4EF6\u5939",
          n = r.join("/"),
          o = await this.resolveFolderId(n)
        ;(await this.client.createDirectory(
          this.getSpaceType(),
          o,
          s,
          this.getFamilyId(),
        ),
          this.clearCache())
      }
      async rename(e, t, r) {
        let s = await this.resolveWoPanFile(t)
        if (!s) throw new Error(`[WoPan] Item not found for rename: ${t}`)
        ;(await this.client.renameFileOrDirectory(
          this.getSpaceType(),
          s.type,
          s.id,
          r,
          this.getFamilyId(),
        ),
          this.clearCache())
      }
      async remove(e, t, r) {
        let s = await this.resolveWoPanFile(t)
        if (!s) throw new Error(`[WoPan] Item not found for deletion: ${t}`)
        let n = [],
          o = []
        ;(s.type === 0 ? n.push(s.id) : o.push(s.id),
          await this.client.deleteFile(this.getSpaceType(), n, o),
          this.clearCache())
      }
      async move(e, t, r, s, n) {
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
      async copy(e, t, r, s, n) {
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
      async put(e, t, r) {
        let s = t.split("/").filter(Boolean),
          n = s.pop() || "upload",
          o = s.join("/"),
          a = await this.resolveFolderId(o)
        ;(await this.client.upload2C(
          this.getSpaceType(),
          n,
          r,
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
          r = 0,
          s = 100
        for (;;) {
          let o =
            (
              await this.client.queryAllFiles(
                this.getSpaceType(),
                e,
                r,
                s,
                this.getSortRuleNum(),
                this.getFamilyId(),
              )
            )?.files || []
          if ((t.push(...o), o.length < s)) break
          r++
        }
        return t
      }
      async resolveFolderId(e) {
        let t = e.split("/").filter(Boolean).join("/")
        if (!t) return this.getRootId()
        if (this.pathFolderIdCache.has(t)) return this.pathFolderIdCache.get(t)
        let r = t.split("/"),
          s = this.getRootId()
        for (let n = 0; n < r.length; n++) {
          let o = r[n],
            a = (() => {
              try {
                return decodeURIComponent(o)
              } catch {
                return o
              }
            })(),
            c = r.slice(0, n + 1).join("/")
          if (this.pathFolderIdCache.has(c)) {
            s = this.pathFolderIdCache.get(c)
            continue
          }
          let d = await this.fetchFolderFiles(s)
          for (let u of d) {
            let p = r.slice(0, n).concat(u.name).join("/")
            ;(this.pathFileMapCache.set(p, u),
              u.type === 0 && this.pathFolderIdCache.set(p, u.id))
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
        let r = t.split("/"),
          s = r.pop(),
          n = (() => {
            try {
              return decodeURIComponent(s)
            } catch {
              return s
            }
          })(),
          o = r.join("/"),
          a = await this.resolveFolderId(o),
          c = await this.fetchFolderFiles(a)
        for (let l of c) {
          let u = r.concat(l.name).join("/")
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
  })
function zr(i) {
  return typeof i == "string" ? Bm.encode(i) : i
}
function Ao(i) {
  let e = i instanceof Uint8Array ? i : new Uint8Array(i),
    t = ""
  for (let r = 0; r < e.length; r++) t += e[r].toString(16).padStart(2, "0")
  return t
}
async function So(i) {
  let e = await crypto.subtle.digest("SHA-256", zr(i))
  return Ao(e)
}
async function jr(i, e) {
  let t = await crypto.subtle.importKey(
      "raw",
      zr(i),
      { name: "HMAC", hash: "SHA-256" },
      !1,
      ["sign"],
    ),
    r = await crypto.subtle.sign("HMAC", t, zr(e))
  return new Uint8Array(r)
}
async function ju(i, e) {
  let t = await jr(i, e)
  return Ao(t)
}
async function Um(i, e) {
  let t = await crypto.subtle.importKey(
      "raw",
      zr(i),
      { name: "HMAC", hash: "SHA-1" },
      !1,
      ["sign"],
    ),
    r = await crypto.subtle.sign("HMAC", t, zr(e))
  return Ao(r)
}
function nt(i, e = !0) {
  let t = encodeURIComponent(i).replace(
    /[!'()*]/g,
    (r) => "%" + r.charCodeAt(0).toString(16).toUpperCase(),
  )
  return (e || (t = t.replace(/%2F/g, "/")), t)
}
function zu(i = new Date()) {
  let e = (l) => l.toString().padStart(2, "0"),
    t = i.getUTCFullYear(),
    r = e(i.getUTCMonth() + 1),
    s = e(i.getUTCDate()),
    n = e(i.getUTCHours()),
    o = e(i.getUTCMinutes()),
    a = e(i.getUTCSeconds()),
    c = `${t}${r}${s}`
  return { amzDate: `${c}T${n}${o}${a}Z`, dateStamp: c }
}
async function Lu(i, e, t, r = "s3") {
  let s = "AWS4" + i,
    n = await jr(s, e),
    o = await jr(n, t),
    a = await jr(o, r)
  return await jr(a, "aws4_request")
}
async function Nu(i) {
  let {
      method: e,
      url: t,
      region: r,
      accessKeyId: s,
      secretAccessKey: n,
      sessionToken: o,
      headers: a = {},
      body: c = null,
      service: d = "s3",
      date: l = new Date(),
    } = i,
    u = new URL(t),
    { amzDate: p, dateStamp: h } = zu(l),
    f =
      c != null
        ? await So(c)
        : "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    g = { ...a }
  ;((g.host = u.host),
    (g["x-amz-date"] = p),
    (g["x-amz-content-sha256"] = f),
    o && (g["x-amz-security-token"] = o))
  let w = Object.keys(g)
      .map((T) => T.toLowerCase())
      .sort(),
    m = ""
  for (let T of w) {
    let q = (Object.entries(g).find(([L]) => L.toLowerCase() === T)?.[1] || "")
      .trim()
      .replace(/\s+/g, " ")
    m += `${T}:${q}
`
  }
  let y = w.join(";"),
    v = u.pathname || "/",
    x = nt(v, !1),
    _ = []
  ;(u.searchParams.forEach((T, O) => {
    _.push([O, T])
  }),
    _.sort(([T], [O]) => (T < O ? -1 : T > O ? 1 : 0)))
  let b = _.map(([T, O]) => `${nt(T)}=${nt(O)}`).join("&"),
    P = [e.toUpperCase(), x, b, m, y, f].join(`
`),
    A = `${h}/${r}/${d}/aws4_request`,
    C = await So(P),
    S = ["AWS4-HMAC-SHA256", p, A, C].join(`
`),
    k = await Lu(n, h, r, d),
    D = await ju(k, S),
    F = `AWS4-HMAC-SHA256 Credential=${s}/${A}, SignedHeaders=${y}, Signature=${D}`
  return ((g.authorization = F), { headers: g, url: u.toString() })
}
async function Os(i) {
  let {
      method: e = "GET",
      url: t,
      region: r,
      accessKeyId: s,
      secretAccessKey: n,
      sessionToken: o,
      expiresInSeconds: a = 14400,
      service: c = "s3",
      date: d = new Date(),
      customQueryParams: l = {},
    } = i,
    u = new URL(t),
    { amzDate: p, dateStamp: h } = zu(d),
    f = `${h}/${r}/${c}/aws4_request`
  ;(u.searchParams.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256"),
    u.searchParams.set("X-Amz-Credential", `${s}/${f}`),
    u.searchParams.set("X-Amz-Date", p),
    u.searchParams.set("X-Amz-Expires", a.toString()),
    u.searchParams.set("X-Amz-SignedHeaders", "host"),
    o && u.searchParams.set("X-Amz-Security-Token", o))
  for (let [D, F] of Object.entries(l)) u.searchParams.set(D, F)
  let g = u.pathname || "/",
    w = nt(g, !1),
    m = []
  ;(u.searchParams.forEach((D, F) => {
    F.toLowerCase() !== "x-amz-signature" && m.push([F, D])
  }),
    m.sort(([D], [F]) => (D < F ? -1 : D > F ? 1 : 0)))
  let y = m.map(([D, F]) => `${nt(D)}=${nt(F)}`).join("&"),
    x = `host:${u.host}
`,
    P = [e.toUpperCase(), w, y, x, "host", "UNSIGNED-PAYLOAD"].join(`
`),
    A = await So(P),
    C = ["AWS4-HMAC-SHA256", p, f, A].join(`
`),
    S = await Lu(n, h, r, c),
    k = await ju(S, C)
  return (u.searchParams.set("X-Amz-Signature", k), u.toString())
}
async function Mu(i, e) {
  let t = "/auth/tmp_token.json",
    r = JSON.stringify({ channel: "OSS_FULL", scopes: ["*"] }),
    s =
      t +
      `
` +
      r,
    n = await Um(e, s),
    o = `TOKEN ${i}:${n}`,
    a = await fetch("https://api.dogecloud.com" + t, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: o },
      body: r,
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
var Bm,
  Co = R(() => {
    "use strict"
    Bm = new TextEncoder()
  })
function le(...i) {
  return i
    .map((e) => e.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/")
}
function Le(i, e = !1) {
  let t = (i || "").replace(/^\/+/, "")
  return (t && e && !t.endsWith("/") && (t += "/"), t)
}
function Lr(i) {
  return i && i.trim() ? i.trim() : ".openlist"
}
function vt(i) {
  let e = i.replace(/\/+$/, ""),
    t = e.lastIndexOf("/")
  return t >= 0 ? e.substring(t + 1) : e
}
function To(i) {
  let e = i.replace(/\/+$/, ""),
    t = e.lastIndexOf("/")
  return t >= 0 ? e.substring(0, t) : ""
}
function Hu(i, e) {
  let t = ("/" + i + "/").replace(/\/+/g, "/")
  return ("/" + e + "/").replace(/\/+/g, "/").startsWith(t)
}
function fe(i, e) {
  let t = i.match(new RegExp(`<${e}[^>]*>([\\s\\S]*?)<\\/${e}>`, "i"))
  return t ? t[1].trim() : void 0
}
function js(i, e) {
  let t = [],
    r = new RegExp(`<${e}[^>]*>([\\s\\S]*?)<\\/${e}>`, "gi"),
    s
  for (; (s = r.exec(i)) !== null; ) t.push(s[1])
  return t
}
function Rt(i) {
  return i
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}
function ot(i, e) {
  let t = fe(i, "Code") || "Unknown",
    r = fe(i, "Message") || i || `HTTP ${e}`,
    s = new Error(`S3 Error [${t}]: ${Rt(r)} (status ${e})`)
  return ((s.code = t), (s.status = e), s)
}
function zm(i, e, t, r = !1) {
  let s = [],
    n = Lr(t),
    o = js(i, "CommonPrefixes")
  for (let l of o) {
    let u = fe(l, "Prefix")
    if (u) {
      let p = Rt(u),
        h = vt(p)
      h &&
        s.push({
          name: h,
          size: 0,
          isFolder: !0,
          modified: new Date().toISOString(),
          path: le(e, h),
        })
    }
  }
  let a = js(i, "Contents")
  for (let l of a) {
    let u = fe(l, "Key")
    if (!u) continue
    let p = Rt(u)
    if (p.endsWith("/")) continue
    let h = vt(p)
    if (!r && (h === n || h === t)) continue
    let f = parseInt(fe(l, "Size") || "0", 10),
      g = fe(l, "LastModified") || new Date().toISOString(),
      w = fe(l, "ETag")?.replace(/"/g, "")
    s.push({
      name: h,
      size: f,
      isFolder: !1,
      modified: g,
      path: le(e, h),
      etag: w,
    })
  }
  let c = fe(i, "IsTruncated") === "true",
    d = fe(i, "NextMarker")
  return {
    files: s,
    isTruncated: c,
    nextMarker: d,
    lastEvaluatedKey: s.length > 0 ? s[s.length - 1].path : void 0,
  }
}
function Lm(i, e, t, r = !1) {
  let s = [],
    n = Lr(t),
    o = js(i, "CommonPrefixes")
  for (let l of o) {
    let u = fe(l, "Prefix")
    if (u) {
      let p = Rt(u),
        h = vt(p)
      h &&
        s.push({
          name: h,
          size: 0,
          isFolder: !0,
          modified: new Date().toISOString(),
          path: le(e, h),
        })
    }
  }
  let a = js(i, "Contents")
  for (let l of a) {
    let u = fe(l, "Key")
    if (!u) continue
    let p = Rt(u)
    if (p.endsWith("/")) continue
    let h = vt(p)
    if (!r && (h === n || h === t)) continue
    let f = parseInt(fe(l, "Size") || "0", 10),
      g = fe(l, "LastModified") || new Date().toISOString(),
      w = fe(l, "ETag")?.replace(/"/g, "")
    s.push({
      name: h,
      size: f,
      isFolder: !1,
      modified: g,
      path: le(e, h),
      etag: w,
    })
  }
  let c = fe(i, "IsTruncated") === "true",
    d = fe(i, "NextContinuationToken")
  return {
    files: s,
    isTruncated: c,
    nextContinuationToken: d,
    lastEvaluatedKey: s.length > 0 ? s[s.length - 1].path : void 0,
  }
}
function Nm(i) {
  let e = fe(i, "UploadId")
  if (!e)
    throw new Error("InitiateMultipartUpload returned empty UploadId: " + i)
  return Rt(e)
}
function Mm(i) {
  let e = fe(i, "ETag")
  if (!e) throw new Error("UploadPartCopy returned empty ETag: " + i)
  return Rt(e).replace(/"/g, "")
}
function Hm(i) {
  let e = Math.max(qm, Math.floor((i - 1) / jm) + 1)
  if (e > Om) throw new Error(`Object size ${i} exceeds multipart copy limit`)
  return e
}
var $m,
  qm,
  Om,
  jm,
  zs,
  Wu = R(() => {
    "use strict"
    Co()
    ;(($m = 5 * 1e3 * 1e3 * 1e3),
      (qm = 100 * 1024 * 1024),
      (Om = 5 * 1024 * 1024 * 1024),
      (jm = 1e4))
    zs = class {
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
          (this.sessionToken = e.session_token
            ? e.session_token.trim()
            : void 0),
          (this.userAgent = e.user_agent ? e.user_agent.trim() : void 0))
        let r = new URL(this.endpoint),
          s =
            /^(\d{1,3}\.){3}\d{1,3}$/.test(r.hostname) ||
            r.hostname === "localhost"
        this.isPathStyle = !!e.force_path_style || s
      }
      updateCredentials(e) {
        ;((this.accessKeyId = e.accessKeyId),
          (this.secretAccessKey = e.secretAccessKey),
          (this.sessionToken = e.sessionToken))
      }
      getUrl(e = "", t) {
        let r = new URL(this.endpoint),
          s = "",
          n = e ? Le(e, !1) : ""
        if (this.isPathStyle) {
          let c = [r.pathname.replace(/\/+$/, ""), this.bucket, n]
            .filter(Boolean)
            .join("/")
          ;((r.pathname = "/" + c.replace(/^\/+/, "")), (s = r.toString()))
        } else {
          let a = r.host.split(":"),
            c = a[1] ? `:${a[1]}` : "",
            d = `${this.bucket}.${a[0]}${c}`
          r.host = d
          let u = [r.pathname.replace(/\/+$/, ""), n].filter(Boolean).join("/")
          ;((r.pathname = "/" + u.replace(/^\/+/, "")), (s = r.toString()))
        }
        let o = new URL(s)
        if (t)
          for (let [a, c] of Object.entries(t))
            c != null && o.searchParams.set(a, c)
        return o.toString()
      }
      async fetch(e, t, r = null, s = {}) {
        let n = { ...s }
        this.userAgent && (n["user-agent"] = this.userAgent)
        let { headers: o } = await Nu({
            method: e,
            url: t,
            region: this.region,
            accessKeyId: this.accessKeyId,
            secretAccessKey: this.secretAccessKey,
            sessionToken: this.sessionToken,
            headers: n,
            body: r,
          }),
          a = { method: e, headers: o }
        return (
          r != null && e !== "GET" && e !== "HEAD" && (a.body = r),
          await fetch(t, a)
        )
      }
      async listObjects(e, t = "v1", r = !1) {
        let s = Le(e, !0),
          n = [],
          o = this.addition.placeholder || ""
        if (t === "v2") {
          let a, c
          for (;;) {
            let d = { "list-type": "2", prefix: s, delimiter: "/" }
            ;(a && (d["continuation-token"] = a), c && (d["start-after"] = c))
            let l = this.getUrl("", d),
              u = await this.fetch("GET", l),
              p = await u.text()
            if (!u.ok) throw ot(p, u.status)
            let h = Lm(p, e, o, r)
            if ((n.push(...h.files), !h.isTruncated)) break
            if (h.nextContinuationToken) {
              a = h.nextContinuationToken
              continue
            }
            if (h.files.length === 0) break
            c = h.lastEvaluatedKey
          }
        } else {
          let a
          for (;;) {
            let c = { prefix: s, delimiter: "/" }
            a && (c.marker = a)
            let d = this.getUrl("", c),
              l = await this.fetch("GET", d),
              u = await l.text()
            if (!l.ok) throw ot(u, l.status)
            let p = zm(u, e, o, r)
            if ((n.push(...p.files), !p.isTruncated)) break
            if (p.nextMarker) a = p.nextMarker
            else if (p.files.length > 0) a = p.files[p.files.length - 1].path
            else break
          }
        }
        return n
      }
      async headObject(e) {
        let t = this.getUrl(e),
          r = await this.fetch("HEAD", t)
        if (r.status === 404) return null
        if (!r.ok) {
          let a = await r.text().catch(() => "")
          throw ot(a, r.status)
        }
        let s = parseInt(r.headers.get("content-length") || "0", 10),
          n = r.headers.get("last-modified") || new Date().toISOString(),
          o = (r.headers.get("etag") || "").replace(/"/g, "")
        return { size: s, modified: n, etag: o }
      }
      async listPrefixProbe(e, t = "v1") {
        let s = { prefix: Le(e, !0), "max-keys": "1" }
        t === "v2" && (s["list-type"] = "2")
        let n = this.getUrl("", s),
          o = await this.fetch("GET", n)
        if (!o.ok) return !1
        let a = await o.text()
        return a.includes("<Contents>") || a.includes("<CommonPrefixes>")
      }
      async putObject(e, t, r = "application/octet-stream") {
        let s = this.getUrl(e),
          n = { "content-type": r },
          o = await this.fetch("PUT", s, t, n)
        if (!o.ok) {
          let a = await o.text().catch(() => "")
          throw ot(a, o.status)
        }
      }
      async deleteObject(e) {
        let t = this.getUrl(e),
          r = await this.fetch("DELETE", t)
        if (!r.ok && r.status !== 404 && r.status !== 204) {
          let s = await r.text().catch(() => "")
          throw ot(s, r.status)
        }
      }
      async copyObject(e, t, r) {
        if (r !== void 0 && r > $m) return this.copyMultipart(e, t, r)
        let s = Le(e, !1),
          n = Le(t, !1),
          o = nt(`${this.bucket}/${s}`, !1),
          a = this.getUrl(n),
          c = { "x-amz-copy-source": o },
          d = await this.fetch("PUT", a, null, c)
        if (!d.ok) {
          let l = await d.text().catch(() => "")
          throw ot(l, d.status)
        }
      }
      async copyMultipart(e, t, r) {
        let s = Le(e, !1),
          n = Le(t, !1),
          o = nt(`${this.bucket}/${s}`, !1),
          a = this.getUrl(n, { uploads: "" }),
          c = await this.fetch("POST", a),
          d = await c.text()
        if (!c.ok) throw ot(d, c.status)
        let l = Nm(d),
          u = Hm(r),
          p = []
        try {
          let h = 0,
            f = 1
          for (; h < r; ) {
            let y = Math.min(h + u, r) - 1,
              v = this.getUrl(n, { partNumber: f.toString(), uploadId: l }),
              x = {
                "x-amz-copy-source": o,
                "x-amz-copy-source-range": `bytes=${h}-${y}`,
              },
              _ = await this.fetch("PUT", v, null, x),
              b = await _.text()
            if (!_.ok) throw ot(b, _.status)
            let P = Mm(b)
            ;(p.push({ partNumber: f, etag: P }), (h += u), f++)
          }
          let g = this.getUrl(n, { uploadId: l }),
            w = [
              "<CompleteMultipartUpload>",
              ...p.map(
                (y) =>
                  `<Part><PartNumber>${y.partNumber}</PartNumber><ETag>${y.etag}</ETag></Part>`,
              ),
              "</CompleteMultipartUpload>",
            ].join(""),
            m = await this.fetch("POST", g, w, {
              "content-type": "application/xml",
            })
          if (!m.ok) {
            let y = await m.text().catch(() => "")
            throw ot(y, m.status)
          }
        } catch (h) {
          let f = this.getUrl(n, { uploadId: l })
          throw (await this.fetch("DELETE", f).catch(() => {}), h)
        }
      }
      async getLink(e, t, r = 4, s = "", n = !1, o = !1, a = !1) {
        let c = Le(e, !1),
          d = Math.max(60, Math.floor(r * 3600)),
          l = this.getUrl(c),
          u = {}
        if (!s) {
          let h = `attachment; filename*=UTF-8''${encodeURIComponent(t)}`
          ;(a &&
            (h = `attachment; filename="${encodeURIComponent(t)}"; filename*=UTF-8''${encodeURIComponent(t)}`),
            (u["response-content-disposition"] = h))
        }
        if (s)
          if (n) {
            let h = await Os({
                url: l,
                region: this.region,
                accessKeyId: this.accessKeyId,
                secretAccessKey: this.secretAccessKey,
                sessionToken: this.sessionToken,
                expiresInSeconds: d,
                customQueryParams: u,
              }),
              f = new URL(h),
              g = s.split("://")
            if (
              (g.length === 2 && (g[0] === "http" || g[0] === "https")
                ? ((f.protocol = g[0] + ":"),
                  (f.host = g[1].replace(/\/+$/, "")))
                : (f.host = s.replace(/\/+$/, "")),
              o)
            ) {
              let w = "/" + this.bucket
              if (f.pathname.startsWith(w)) {
                let m = f.pathname.substring(w.length)
                ;(m || (m = "/"), (f.pathname = m))
              }
            }
            return { url: f.toString() }
          } else {
            let h = s.split("://"),
              f = "https",
              g = s
            h.length === 2 &&
              (h[0] === "http" || h[0] === "https") &&
              ((f = h[0]), (g = h[1].replace(/\/+$/, "")))
            let w = this.isPathStyle ? `/${this.bucket}/${c}` : `/${c}`
            return (
              o &&
                w.startsWith(`/${this.bucket}`) &&
                ((w = w.substring(`/${this.bucket}`.length)), w || (w = "/")),
              { url: `${f}://${g}${w.startsWith("/") ? "" : "/"}${w}` }
            )
          }
        return {
          url: await Os({
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
      async getDirectUploadInfo(e, t, r = 4, s = "") {
        let n = le(e, t),
          o = Le(n, !1),
          a = Math.max(60, Math.floor(r * 3600)),
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
          upload_url: await Os({
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
  })
function Wm(i) {
  let e = { ...(i || {}) }
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
var Ls,
  Ku = R(() => {
    "use strict"
    ee()
    ie()
    Wu()
    Co()
    Ls = class {
      client
      addition
      driverName
      dogeExpiredAt
      dogeTimer
      constructor(e, t = "S3") {
        ;((this.addition = Wm(e)),
          (this.driverName = t),
          (this.client = new zs(this.addition)))
      }
      async init() {
        this.driverName.toLowerCase().includes("doge") &&
          (await this.refreshDogeToken())
      }
      async refreshDogeToken() {
        try {
          let e = await Mu(
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
            console.error(
              "[S3Driver] DogeCloud init/refresh session error:",
              e,
            ),
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
        this.dogeTimer &&
          (clearInterval(this.dogeTimer), (this.dogeTimer = void 0))
      }
      getRemotePath(e) {
        let t = this.addition.root_folder_path || "/",
          r = e || "/"
        return (t !== "/" && !Hu(t, r) && (r = le(t, r)), Le(r, !1))
      }
      async fileItemFromS3(e, t) {
        let r, s
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
          ;((r = n.url), (s = n.headers))
        }
        return {
          name: e.name,
          size: e.size,
          is_dir: e.isFolder,
          modified: e.modified,
          sign: e.etag || t,
          type: z(e.name, e.isFolder),
          thumb: "",
          raw_url: r,
          raw_url_headers: s,
        }
      }
      async list(e, t) {
        await this.checkDogeToken()
        let r = this.getRemotePath(t),
          s = this.addition.list_object_version === "v2" ? "v2" : "v1",
          n = await this.client.listObjects(r, s, !1),
          o = []
        for (let a of n) {
          let c = le(r, a.name),
            d = await this.fileItemFromS3(a, c)
          o.push(d)
        }
        return N(
          o,
          this.addition.order_by || "name",
          this.addition.order_direction || "asc",
        )
      }
      async get(e, t) {
        await this.checkDogeToken()
        let r = this.getRemotePath(t),
          s = await this.client.headObject(r)
        if (s) {
          let a = vt(r)
          return this.fileItemFromS3(
            {
              name: a,
              size: s.size,
              isFolder: !1,
              modified: s.modified,
              path: r,
              etag: s.etag,
            },
            r,
          )
        }
        let n = this.addition.list_object_version === "v2" ? "v2" : "v1"
        if ((await this.client.listPrefixProbe(r, n)) || r === "" || r === "/")
          return {
            name: vt(r),
            size: 0,
            is_dir: !0,
            modified: new Date().toISOString(),
            sign: r,
            type: 1,
          }
        throw new Error(`Object not found: ${t}`)
      }
      async mkdir(e, t) {
        await this.checkDogeToken()
        let r = this.getRemotePath(t),
          s = Lr(this.addition.placeholder),
          n = le(r, s)
        await this.client.putObject(n, new Uint8Array(0))
      }
      async rename(e, t, r) {
        await this.checkDogeToken()
        let s = this.getRemotePath(t),
          n = To(s),
          o = le(n, r),
          a = await this.client.headObject(s)
        a
          ? (await this.client.copyObject(s, o, a.size),
            await this.client.deleteObject(s))
          : (await this.copyDirRecursive(s, o),
            await this.removeDirRecursive(s))
      }
      async move(e, t, r, s, n) {
        await this.checkDogeToken()
        let o = this.getRemotePath(s),
          a = this.getRemotePath(n)
        for (let c of r) {
          let d = le(o, c),
            l = le(a, c),
            u = await this.client.headObject(d)
          u
            ? (await this.client.copyObject(d, l, u.size),
              await this.client.deleteObject(d))
            : (await this.copyDirRecursive(d, l),
              await this.removeDirRecursive(d))
        }
      }
      async copy(e, t, r, s, n) {
        await this.checkDogeToken()
        let o = this.getRemotePath(s),
          a = this.getRemotePath(n)
        for (let c of r) {
          let d = le(o, c),
            l = le(a, c),
            u = await this.client.headObject(d)
          u
            ? await this.client.copyObject(d, l, u.size)
            : await this.copyDirRecursive(d, l)
        }
      }
      async copyDirRecursive(e, t) {
        let r = this.addition.list_object_version === "v2" ? "v2" : "v1",
          s = await this.client.listObjects(e, r, !0)
        for (let n of s) {
          let o = le(e, n.name),
            a = le(t, n.name)
          n.isFolder
            ? await this.copyDirRecursive(o, a)
            : await this.client.copyObject(o, a, n.size)
        }
      }
      async remove(e, t, r) {
        await this.checkDogeToken()
        let s = this.getRemotePath(t)
        if (r && r.length > 0)
          for (let n of r) {
            let o = le(s, n)
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
          r = await this.client.listObjects(e, t, !0)
        for (let n of r) {
          let o = le(e, n.name)
          n.isFolder
            ? await this.removeDirRecursive(o)
            : await this.client.deleteObject(o)
        }
        let s = Lr(this.addition.placeholder)
        ;(await this.client.deleteObject(le(e, s)).catch(() => {}),
          this.addition.placeholder &&
            (await this.client
              .deleteObject(le(e, this.addition.placeholder))
              .catch(() => {})))
      }
      async put(e, t, r) {
        await this.checkDogeToken()
        let s = this.getRemotePath(t)
        await this.client.putObject(s, r)
      }
      async getDirectUploadInfo(e, t) {
        if (!this.addition.enable_direct_upload)
          throw new Error("Direct upload is not enabled")
        await this.checkDogeToken()
        let r = this.getRemotePath(e)
        return await this.client.getDirectUploadInfo(
          r,
          t,
          Number(this.addition.sign_url_expire) || 4,
          this.addition.direct_upload_host,
        )
      }
      async other(e, t, r) {
        if (e === "direct_upload" || e === "get_direct_upload_info") {
          let s = r?.name || r?.fileName || vt(t),
            n = To(t)
          return await this.getDirectUploadInfo(n, s)
        }
        throw new Error(`Unsupported method ${e}`)
      }
    }
  })
function Do(i, e) {
  return (i << e) | (i >>> (32 - e))
}
function Gu(i) {
  if (typeof Buffer < "u") return Buffer.from(i).toString("base64")
  let e = ""
  for (let t = 0; t < i.length; t++) e += String.fromCharCode(i[t])
  return btoa(e)
}
var Ns,
  Vu = R(() => {
    "use strict"
    Ns = class i {
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
        let r = 0
        for (; r < t; ) {
          let s = 64 - this.blockLen,
            n = Math.min(s, t - r)
          ;(this.block.set(e.subarray(r, r + n), this.blockLen),
            (this.blockLen += n),
            (r += n),
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
          t[c] = Do(t[c - 3] ^ t[c - 8] ^ t[c - 14] ^ t[c - 16], 1)
        let r = this.h0,
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
          let u = (Do(r, 5) + d + a + l + t[c]) | 0
          ;((a = o), (o = n), (n = Do(s, 30)), (s = r), (r = u))
        }
        ;((this.h0 = (this.h0 + r) | 0),
          (this.h1 = (this.h1 + s) | 0),
          (this.h2 = (this.h2 + n) | 0),
          (this.h3 = (this.h3 + o) | 0),
          (this.h4 = (this.h4 + a) | 0))
      }
      getStateHex() {
        let e = [this.h0, this.h1, this.h2, this.h3, this.h4],
          t = ""
        for (let r of e) {
          let s = (r & 255).toString(16).padStart(2, "0"),
            n = ((r >>> 8) & 255).toString(16).padStart(2, "0"),
            o = ((r >>> 16) & 255).toString(16).padStart(2, "0"),
            a = ((r >>> 24) & 255).toString(16).padStart(2, "0")
          t += s + n + o + a
        }
        return t.toLowerCase()
      }
      digestHex() {
        let e = new i()
        ;((e.h0 = this.h0),
          (e.h1 = this.h1),
          (e.h2 = this.h2),
          (e.h3 = this.h3),
          (e.h4 = this.h4),
          e.block.set(this.block),
          (e.blockLen = this.blockLen),
          (e.totalBytes = this.totalBytes))
        let t = e.blockLen < 56 ? 56 - e.blockLen : 120 - e.blockLen,
          r = new Uint8Array(t + 8)
        r[0] = 128
        let s = e.totalBytes * 8,
          n = Math.floor(e.totalBytes / 536870912),
          o = (s & 4294967295) >>> 0,
          a = new DataView(r.buffer, r.byteOffset + t, 8)
        return (
          a.setUint32(0, n, !1),
          a.setUint32(4, o, !1),
          e.update(r),
          [e.h0, e.h1, e.h2, e.h3, e.h4]
            .map((d) => (d >>> 0).toString(16).padStart(8, "0"))
            .join("")
            .toLowerCase()
        )
      }
    }
  })
function Ju(i) {
  let e = new Map()
  if (!i) return e
  let t = i.split(";")
  for (let r of t) {
    let s = r.trim()
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
function Ms(i) {
  let e = []
  for (let [t, r] of i.entries()) t && r && e.push(`${t}=${r}`)
  return e.join("; ")
}
var Hs,
  Qu = R(() => {
    "use strict"
    Vu()
    Hs = class {
      cookies = new Map()
      onCookieUpdate
      pendingCookie = null
      addition
      constructor(e, t) {
        ;((this.addition = e),
          (this.cookies = Ju(e.cookies || "")),
          (this.onCookieUpdate = t))
      }
      getCookies() {
        return this.cookies
      }
      getCookieStr() {
        return Ms(this.cookies)
      }
      setCookiesStr(e) {
        ;((this.cookies = Ju(e)),
          (this.pendingCookie = Ms(this.cookies)),
          (this.addition.cookies = this.pendingCookie),
          this.onCookieUpdate && this.onCookieUpdate(this.pendingCookie))
      }
      updateCookiesFromHeaders(e) {
        let t = e.getSetCookie,
          r = []
        if (typeof t == "function") r = t.call(e)
        else {
          let n = e.get("set-cookie")
          n && (r = [n])
        }
        let s = !1
        for (let n of r) {
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
          ((this.pendingCookie = Ms(this.cookies)),
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
          r = this.cookies.get("weiyun_qq_openid") || ""
        return e === "2" && t
          ? "weixin_openid"
          : e === "2" && r
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
        let r = `https://api.weixin.qq.com/sns/oauth2/refresh_token?grant_type=refresh_token&appid=${encodeURIComponent(e)}&refresh_token=${encodeURIComponent(t)}`,
          n = await (await fetch(r)).json().catch(() => ({}))
        if (n.errcode)
          throw new Error(`[WeiYun] WeChat refresh token failed: ${n.errmsg}`)
        ;(n.openid && this.cookies.set("openid", n.openid),
          n.access_token && this.cookies.set("access_token", n.access_token),
          n.refresh_token && this.cookies.set("refresh_token", n.refresh_token),
          (this.pendingCookie = Ms(this.cookies)),
          (this.addition.cookies = this.pendingCookie),
          this.onCookieUpdate && this.onCookieUpdate(this.pendingCookie))
      }
      newHeader(e, t) {
        let r = t.openid || t.minico_openid || ""
        return {
          seq: Math.floor(Date.now() / 1e3),
          cmd: e,
          wx_openid: r,
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
      newBody(e, t, r) {
        return {
          ReqMsg_body: {
            ext_req_head: {
              token_info: r,
              language_info: { language_type: 2052 },
            },
            [`.weiyun.${e}MsgReq_body`]: t,
          },
        }
      }
      newUploadJson(e, t, r) {
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
          req_body: { ReqMsg_body: { [`weiyun.${e}MsgReq_body`]: r } },
        }
      }
      async request(e, t, r, s, n) {
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
          ((c = `https://www.weiyun.com/api/v3/ftn_pre_upload?g_tk=${encodeURIComponent(a)}&cmd=${r}`),
            (d = JSON.stringify(this.newUploadJson(t, r, s))),
            (l["Content-Type"] = "application/json; charset=UTF-8"))
        else if (e === "upload") {
          c = `https://upload.weiyun.com/ftnup_v2/weiyun?g_tk=${encodeURIComponent(a)}&cmd=${r}`
          let g = "----WebKitFormBoundaryIifrOqiswelC8nfe"
          l["Content-Type"] = `multipart/form-data; boundary=${g}`
          let w = JSON.stringify(this.newUploadJson(t, r, s)),
            m = `--${g}\r
Content-Disposition: form-data; name="json"\r
\r
${w}\r
`,
            y = ""
          n &&
            n.length > 0 &&
            (y = `--${g}\r
Content-Disposition: form-data; name="upload"; filename="blob"\r
Content-Type: application/octet-stream\r
\r
`)
          let v = `\r
--${g}--\r
`,
            x = new TextEncoder(),
            _ = x.encode(m),
            b = n ? x.encode(y) : new Uint8Array(0),
            P = x.encode(v),
            A = n ? new Uint8Array(n) : new Uint8Array(0),
            C = _.length + b.length + A.length + P.length,
            S = new Uint8Array(C),
            k = 0
          ;(S.set(_, k),
            (k += _.length),
            b.length > 0 &&
              (S.set(b, k), (k += b.length), S.set(A, k), (k += A.length)),
            S.set(P, k),
            (d = S))
        } else
          ((c = `https://www.weiyun.com/webapp/json/${e}/${t}?g_tk=${encodeURIComponent(a)}&cmd=${r}`),
            (d = JSON.stringify({
              req_header: JSON.stringify(this.newHeader(r, o)),
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
          } catch (g) {
            throw new Error(`[WeiYun] Request failed (403): ${g.message}`)
          }
        if (!u.ok) {
          let g = await u.text().catch(() => "")
          throw new Error(`[WeiYun] HTTP ${u.status}: ${g}`)
        }
        let p = await u.json().catch(() => ({})),
          h = p.data || p.result
        if (p.ret !== void 0 && p.ret !== 0)
          throw new Error(`[WeiYun] Error (${p.ret}): ${p.msg || "Unknown"}`)
        if (h?.rsp_header && h.rsp_header.retcode !== 0) {
          let g = h.rsp_header
          throw new Error(
            `[WeiYun] Cmd ${g.cmd} (${g.cmdName || t}) Error (${g.retcode}): ${g.retmsg || "Unknown error"}`,
          )
        }
        if (e === "preUpload")
          return h?.rsp_body?.RspMsg_body?.weiyunPreUploadMsgRsp_body || p
        if (e === "upload")
          return h?.rsp_body?.RspMsg_body?.[`weiyun.${t}MsgRsp_body`] || p
        let f = h?.rsp_body?.RspMsg_body
        if (typeof f == "string")
          try {
            return JSON.parse(f)
          } catch {
            return f
          }
        return f || h || p
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
        let r =
          (
            await this.request(
              "weiyunQdiskClient",
              "DiskFileBatchDownload",
              2402,
              { file_list: [e], download_type: 0 },
            )
          ).file_list || []
        if (!r || r.length === 0)
          throw new Error("[WeiYun] No download link returned")
        return r[0]
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
        await this.request(
          "weiyunQdiskClient",
          "DiskDirFileBatchDeleteEx",
          2509,
          { file_list: [e] },
        )
      }
      async diskDirDelete(e) {
        await this.request(
          "weiyunQdiskClient",
          "DiskDirFileBatchDeleteEx",
          2509,
          { dir_list: [e] },
        )
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
      async preUpload(e, t, r, s, n, o = 4, a = 1) {
        let d = 0,
          l = s,
          u = 0
        s > 0 &&
          ((l = s % 1048576),
          l === 0 && (l = 1048576),
          (u = l % 128),
          u === 0 && (u = 128),
          (d = s - l))
        let p = [],
          h = new Ns()
        for (let _ = 0; _ < d; _ += 1048576) {
          let b = n.subarray(_, _ + 1048576)
          ;(h.update(b),
            p.push({ sha: h.getStateHex(), offset: _, size: 1048576 }))
        }
        let f = n.subarray(d, d + l - u)
        h.update(f)
        let g = h.getStateHex(),
          w = n.subarray(d + l - u, s)
        h.update(w)
        let m = Gu(w),
          y = h.digestHex()
        p.push({ sha: y, offset: d, size: l })
        let v = {
            common_upload_req: {
              ppdir_key: e,
              pdir_key: t,
              file_size: s,
              filename: r,
              file_exist_option: a,
              use_mutil_channel: !0,
            },
            upload_scr: 0,
            channel_count: o,
            block_size: 1048576,
            check_sha: g,
            check_data: m,
            block_info_list: p,
          },
          x = await this.request("preUpload", "PreUpload", 247120, v)
        return (
          x.common_upload_rsp &&
            ((x.common_upload_rsp.file_sha = y),
            (x.common_upload_rsp.file_size = s)),
          x
        )
      }
      async addUploadChannel(e, t, r) {
        return this.request("upload", "AddChannel", 247122, {
          upload_key: r.upload_key,
          ex: r.ex,
          orig_channel_count: e,
          dest_channel_count: t,
          speed: 4303,
        })
      }
      async uploadPiece(e, t, r) {
        let s = await this.request(
          "upload",
          "UploadPiece",
          247121,
          { upload_key: t.upload_key, ex: t.ex, channel: e },
          r,
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
  })
function Gm(i) {
  return Buffer.from(JSON.stringify(i), "utf8").toString("base64")
}
function Vm(i) {
  try {
    let e = JSON.parse(Buffer.from(i, "base64").toString("utf8"))
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
function e0(i) {
  if (!i) return new Date().toISOString()
  try {
    let e = typeof i == "string" ? parseInt(i, 10) : i
    if (!isNaN(e) && e > 0) {
      let r = e < 1e10 ? e * 1e3 : e
      return new Date(r).toISOString()
    }
    let t = new Date(i)
    if (!isNaN(t.getTime())) return t.toISOString()
  } catch {}
  return new Date().toISOString()
}
function Yu(i) {
  return {
    name: i.dir_name,
    size: 0,
    is_dir: !0,
    modified: e0(i.dir_mtime || i.dir_ctime),
    sign: i.dir_key,
    type: 1,
    thumb: "",
    raw_url: "",
  }
}
function Zu(i) {
  return {
    name: i.filename,
    size: i.file_size || 0,
    is_dir: !1,
    modified: e0(i.file_mtime || i.file_ctime),
    sign: i.file_id,
    type: z(i.filename, !1),
    thumb: i.ext_info?.thumb_url || "",
    raw_url: "",
  }
}
function Eo(i) {
  let e = { ...(i || {}) }
  return (
    (e.root_folder_id = (e.root_folder_id || "").trim()),
    (e.cookies = (e.cookies || "").trim()),
    (e.order_by = e.order_by || "name"),
    (e.order_direction = e.order_direction || "asc"),
    (e.upload_thread = e.upload_thread || "4"),
    e
  )
}
var Km,
  Xu,
  Ws,
  t0 = R(() => {
    "use strict"
    ee()
    ie()
    Qu()
    ;((Km = 45), (Xu = 1024 * 1024))
    Ws = class {
      client
      addition
      rootFolderId = ""
      rootPdirKey = ""
      uploadThreads = 4
      pathFolderCache = new Map()
      budget = { used: 0, limit: Km }
      constructor(e, t) {
        ;((this.addition = Eo(e)), (this.client = new Hs(this.addition, t)))
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
        let r = t[t.length - 1]
        ;((this.rootPdirKey = r.pdir_key || ""),
          this.pathFolderCache.set("/", {
            dirKey: this.rootFolderId,
            pdirKey: this.rootPdirKey,
            dirName: r.dir_name || "root",
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
        let r = t.split("/").filter(Boolean),
          s = {
            dirKey: this.rootFolderId,
            pdirKey: this.rootPdirKey,
            dirName: "root",
          },
          n = ""
        for (let o = 0; o < r.length; o++) {
          let a = r[o],
            c = (() => {
              try {
                return decodeURIComponent(a)
              } catch {
                return a
              }
            })()
          if (
            ((n = "/" + r.slice(0, o + 1).join("/")),
            this.pathFolderCache.has(n))
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
          ).find((p) => p.dir_name === a || p.dir_name === c || p.dir_key === a)
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
        let r = t[t.length - 1],
          s = (() => {
            try {
              return decodeURIComponent(r)
            } catch {
              return r
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
            (l) => l.filename === r || l.filename === s || l.file_id === r,
          )
        if (c) return { file: c, parent: o, isDir: !1 }
        let d = (a.dir_list || []).find(
          (l) => l.dir_name === r || l.dir_name === s || l.dir_key === r,
        )
        if (d) return { folder: d, parent: o, isDir: !0 }
        throw new Error(
          `[WeiYun] \u6587\u4EF6\u6216\u76EE\u5F55\u672A\u627E\u5230: ${r}`,
        )
      }
      async list(e, t) {
        this.budget.used = 0
        let r = await this.resolveFolder(t),
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
            l = await this.client.diskDirFileList(r.dirKey, {
              start: o,
              count: 500,
              sortField: c,
              reverseOrder: d,
              getType: 0,
            }),
            u = l.dir_list || [],
            p = l.file_list || []
          for (let h of u) ((h.pdir_key = r.dirKey), s.push(h))
          for (let h of p) ((h.pdir_key = r.dirKey), n.push(h))
          if (
            ((o = s.length + n.length),
            l.finish_flag || (u.length === 0 && p.length === 0))
          )
            break
        }
        let a = [...s.map(Yu), ...n.map(Zu)]
        return N(
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
        let r =
          "/" +
          String(t || "")
            .split("/")
            .filter(Boolean)
            .join("/")
        if (r === "/" || r === `/${this.rootFolderId}`)
          return {
            name: "root",
            size: 0,
            is_dir: !0,
            modified: new Date().toISOString(),
            sign: this.rootFolderId,
            type: 1,
            raw_url: "",
          }
        let {
          file: s,
          folder: n,
          parent: o,
          isDir: a,
        } = await this.resolveFile(t)
        if (a && n) return Yu(n)
        if (s) {
          let c = Zu(s)
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
        let r = String(t || "")
            .split("/")
            .filter(Boolean),
          s = r.pop() || "\u65B0\u5EFA\u6587\u4EF6\u5939",
          n = "/" + r.join("/"),
          o = await this.resolveFolder(n)
        await this.client.diskDirCreate({
          ppdir_key: o.pdirKey,
          pdir_key: o.dirKey,
          dir_name: s,
        })
      }
      async rename(e, t, r) {
        this.budget.used = 0
        let {
          file: s,
          folder: n,
          parent: o,
          isDir: a,
        } = await this.resolveFile(t)
        a && n
          ? await this.client.diskDirAttrModify(
              {
                ppdir_key: o.pdirKey,
                pdir_key: o.dirKey,
                dir_key: n.dir_key,
                dir_name: n.dir_name,
              },
              r,
            )
          : s &&
            (await this.client.diskFileRename(
              {
                ppdir_key: o.pdirKey,
                pdir_key: o.dirKey,
                file_id: s.file_id,
                filename: s.filename,
              },
              r,
            ))
      }
      async remove(e, t, r) {
        this.budget.used = 0
        let {
          file: s,
          folder: n,
          parent: o,
          isDir: a,
        } = await this.resolveFile(t)
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
      async move(e, t, r, s, n) {
        this.budget.used = 0
        let {
            file: o,
            folder: a,
            parent: c,
            isDir: d,
          } = await this.resolveFile(s),
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
      async copy(e, t, r, s, n) {
        throw new Error(
          "[WeiYun] \u5FAE\u4E91\u63A5\u53E3\u4E0D\u652F\u6301\u590D\u5236\u64CD\u4F5C (Copy not supported)",
        )
      }
      async put(e, t, r) {
        let s = String(t || "")
            .split("/")
            .filter(Boolean),
          n = s.pop()
        if (!n) throw new Error("[WeiYun] \u4E0A\u4F20\u8DEF\u5F84\u65E0\u6548")
        let o = "/" + s.join("/"),
          a = await this.resolveFolder(o),
          c = await this.client.preUpload(
            a.pdirKey,
            a.dirKey,
            n,
            r.length,
            r,
            4,
            1,
          )
        if (c.file_exist) return
        let d = { upload_key: c.upload_key || "", ex: c.ex || "" },
          l = c.channel_list || []
        l.length === 0 && (l = [{ id: 0, offset: 0, len: r.length }])
        for (let u of l) {
          let p = { ...u }
          for (; p.offset < r.length; ) {
            let h = Math.min(p.len || Xu, r.length - p.offset),
              f = r.subarray(p.offset, p.offset + h),
              g = await this.client.uploadPiece(p, d, f)
            if (g.upload_state === 2) break
            g.channel ? (p = g.channel) : (p.offset += h)
          }
        }
      }
      async createUploadSession(e, t, r, s, n) {
        this.budget.used = 0
        let o = await this.resolveFolder(t || "/"),
          a = Xu,
          c = Math.max(1, Math.ceil(Math.max(0, Number(s) || 0) / a)),
          d = new Uint8Array(0),
          l = await this.client.preUpload(
            o.pdirKey,
            o.dirKey,
            r,
            Math.max(0, Number(s) || 0),
            d,
            4,
            1,
          )
        if (l.file_exist)
          return { reuse: !0, partCount: 0, chunkSize: a, session: "" }
        let u = { upload_key: l.upload_key || "", ex: l.ex || "" },
          p = l.channel_list || []
        if (p.length < this.uploadThreads && u.upload_key)
          try {
            let h = await this.client.addUploadChannel(
              p.length,
              this.uploadThreads,
              u,
            )
            h.channels && (p = [...p, ...h.channels])
          } catch {}
        return {
          reuse: !1,
          partCount: c,
          chunkSize: a,
          session: Gm({
            uploadKey: u.upload_key,
            ex: u.ex,
            parentDirKey: o.pdirKey,
            pdirKey: o.dirKey,
            fileName: r,
            size: Math.max(0, Number(s) || 0),
            partCount: c,
            chunkSize: a,
            channels: p,
          }),
        }
      }
      async uploadPart(e, t, r) {
        let s = Vm(e)
        if (!Number.isInteger(t) || t < 1 || t > s.partCount)
          throw new Error(`[WeiYun] \u5206\u7247\u5E8F\u53F7\u65E0\u6548: ${t}`)
        let n = (t - 1) * s.chunkSize,
          o = { id: t - 1, offset: n, len: r.length },
          a = { upload_key: s.uploadKey, ex: s.ex }
        return (await this.client.uploadPiece(o, a, r), { partNumber: t })
      }
      async completeUploadSession(e, t = []) {}
    }
  })
async function hg(i, e) {
  let t = `${i}${e}1appkey`,
    r = await gt(t),
    s = Ve(r)
  return `div101.${i}${s}`
}
async function r0(i, e, t, r, s, n, o) {
  let a = await hg(i, n)
  return [
    `ANDROID-${t}/${s}`,
    "protocolVersion/200",
    "accesstype/",
    `clientid/${e}`,
    `clientversion/${s}`,
    "action_type/",
    "networktype/WIFI",
    "sessionid/",
    `deviceid/${i}`,
    "providername/NONE",
    `devicesign/${a}`,
    "refresh_token/",
    `sdkversion/${r}`,
    `datetime/${Date.now()}`,
    `usrno/${o}`,
    `appname/android-${t}`,
    "session_origin/",
    "grant_type/",
    "appid/",
    "clientip/",
    "devicename/Xiaomi_M2004j7ac",
    "osversion/13",
    "platformversion/10",
    "accessmode/",
    "devicemodel/M2004J7AC",
  ].join(" ")
}
function Fo(i, e) {
  try {
    let t = new URL(e)
    return `${i.toUpperCase()}:${t.pathname}`
  } catch {
    let t = e.match(/:\/\/[^/]+((\/[^/\s?#]+)*)/)
    return `${i.toUpperCase()}:${t ? t[1] : ""}`
  }
}
var Jm,
  Qm,
  Xm,
  Ym,
  Zm,
  eg,
  tg,
  rg,
  ig,
  sg,
  ng,
  og,
  ag,
  cg,
  dg,
  lg,
  ug,
  pg,
  Ks,
  i0 = R(() => {
    "use strict"
    yt()
    ;((Jm = [
      "SOP04dGzk0TNO7t7t9ekDbAmx+eq0OI1ovEx",
      "nVBjhYiND4hZ2NCGyV5beamIr7k6ifAsAbl",
      "Ddjpt5B/Cit6EDq2a6cXgxY9lkEIOw4yC1GDF28KrA",
      "VVCogcmSNIVvgV6U+AochorydiSymi68YVNGiz",
      "u5ujk5sM62gpJOsB/1Gu/zsfgfZO",
      "dXYIiBOAHZgzSruaQ2Nhrqc2im",
      "z5jUTBSIpBN9g4qSJGlidNAutX6",
      "KJE2oveZ34du/g1tiimm",
    ]),
      (Qm = [
        "C9qPpZLN8ucRTaTiUMWYS9cQvWOE",
        "+r6CQVxjzJV6LCV",
        "F",
        "pFJRC",
        "9WXYIDGrwTCz2OiVlgZa90qpECPD6olt",
        "/750aCr4lm/Sly/c",
        "RB+DT/gZCrbV",
        "",
        "CyLsf7hdkIRxRm215hl",
        "7xHvLi2tOYP0Y92b",
        "ZGTXXxu8E/MIWaEDB+Sm/",
        "1UI3",
        "E7fP5Pfijd+7K+t6Tg/NhuLq0eEUVChpJSkrKxpO",
        "ihtqpG6FMt65+Xk+tWUH2",
        "NhXXU9rg4XXdzo7u5o",
      ]),
      (Xm = [
        "KHBJ07an7ROXDoK7Db",
        "G6n399rSWkl7WcQmw5rpQInurc1DkLmLJqE",
        "JZD1A3M4x+jBFN62hkr7VDhkkZxb9g3rWqRZqFAAb",
        "fQnw/AmSlbbI91Ik15gpddGgyU7U",
        "/Dv9JdPYSj3sHiWjouR95NTQff",
        "yGx2zuTjbWENZqecNI+edrQgqmZKP",
        "ljrbSzdHLwbqcRn",
        "lSHAsqCkGDGxQqqwrVu",
        "TsWXI81fD1",
        "vk7hBjawK/rOSrSWajtbMk95nfgf3",
      ]),
      (Ym = "YNxT9w7GMdWvEOKa"),
      (Zm = "dbw2OtmVEeuUvIptb1Coyg"),
      (eg = "1.53.2"),
      (tg = "com.pikcloud.pikpak"),
      (rg = "2.0.6.206003"),
      (ig = "YUMx5nI8ZU8Ap8pm"),
      (sg = "dbw2OtmVEeuUvIptb1Coyg"),
      (ng = "2.0.0"),
      (og = "mypikpak.com"),
      (ag = "8.0.3"),
      (cg = "YvtoWO6GNHiuCl7x"),
      (dg = "1NIH5R1IEe2pAxZE3hv3uA"),
      (lg = "undefined"),
      (ug = "mypikpak.com"),
      (pg = "8.0.3"))
    Ks = class {
      addition
      clientId
      clientSecret
      clientVersion
      packageName
      sdkVersion
      algorithms
      deviceId
      userId = ""
      userAgent = ""
      accessToken = ""
      refreshTokenVal = ""
      captchaTokenVal = ""
      onTokenRefreshed
      constructor(e, t) {
        ;((this.addition = e),
          (this.onTokenRefreshed = t),
          (this.refreshTokenVal = e.refresh_token || ""),
          (this.captchaTokenVal = e.captcha_token || ""))
        let r = e.platform || "web"
        ;(r === "android"
          ? ((this.clientId = Ym),
            (this.clientSecret = Zm),
            (this.clientVersion = eg),
            (this.packageName = tg),
            (this.sdkVersion = rg),
            (this.algorithms = Jm))
          : r === "pc"
            ? ((this.clientId = cg),
              (this.clientSecret = dg),
              (this.clientVersion = lg),
              (this.packageName = ug),
              (this.sdkVersion = pg),
              (this.algorithms = Xm),
              (this.userAgent =
                "MainWindow Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) PikPak/2.6.11.4955 Chrome/100.0.4896.160 Electron/18.3.15 Safari/537.36"))
            : ((this.clientId = ig),
              (this.clientSecret = sg),
              (this.clientVersion = ng),
              (this.packageName = og),
              (this.sdkVersion = ag),
              (this.algorithms = Qm),
              (this.userAgent =
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")),
          (this.deviceId =
            e.device_id || Ve(`${e.username || ""}${e.password || ""}`)))
      }
      getCaptchaSign() {
        let e = String(Date.now()),
          t = `${this.clientId}${this.clientVersion}${this.packageName}${this.deviceId}${e}`
        for (let r of this.algorithms) t = Ve(t + r)
        return { timestamp: e, sign: `1.${t}` }
      }
      async refreshCaptchaToken(e, t) {
        let r = {
            action: e,
            captcha_token: this.captchaTokenVal,
            client_id: this.clientId,
            device_id: this.deviceId,
            meta: t,
            redirect_uri: "xlaccsdk01://xbase.cloud/callback?state=harbor",
          },
          n = await (
            await fetch(
              `https://user.mypikpak.net/v1/shield/captcha/init?client_id=${encodeURIComponent(this.clientId)}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "User-Agent": this.userAgent || "OpenListNext",
                  "X-Device-ID": this.deviceId,
                },
                body: JSON.stringify(r),
              },
            )
          ).json()
        if (n.error_code && n.error_code !== 0)
          throw new Error(
            `Captcha error ${n.error_code}: ${n.error_description || n.error}`,
          )
        if (n.url)
          throw new Error(`PikPak requires captcha verification: ${n.url}`)
        return (
          n.captcha_token && (this.captchaTokenVal = n.captcha_token),
          this.captchaTokenVal
        )
      }
      async refreshCaptchaTokenAtLogin(e, t) {
        let { timestamp: r, sign: s } = this.getCaptchaSign(),
          n = {
            client_version: this.clientVersion,
            package_name: this.packageName,
            user_id: t,
            timestamp: r,
            captcha_sign: s,
          }
        return this.refreshCaptchaToken(e, n)
      }
      async refreshCaptchaTokenInLogin(e, t) {
        let r = {}
        return (
          /^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/.test(t)
            ? (r.email = t)
            : t.length >= 11 && t.length <= 18
              ? (r.phone_number = t)
              : (r.username = t),
          this.refreshCaptchaToken(e, r)
        )
      }
      async login() {
        if (!this.addition.username || !this.addition.password)
          throw new Error(
            "PikPak username or password is required when refresh_token is not provided",
          )
        let e = "https://user.mypikpak.net/v1/auth/signin"
        this.captchaTokenVal ||
          (await this.refreshCaptchaTokenInLogin(
            Fo("POST", e),
            this.addition.username,
          ))
        let r = await (
          await fetch(`${e}?client_id=${encodeURIComponent(this.clientId)}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": this.userAgent || "OpenListNext",
              "X-Device-ID": this.deviceId,
              "X-Captcha-Token": this.captchaTokenVal,
            },
            body: JSON.stringify({
              captcha_token: this.captchaTokenVal,
              client_id: this.clientId,
              client_secret: this.clientSecret,
              username: this.addition.username,
              password: this.addition.password,
            }),
          })
        ).json()
        if (r.error_code && r.error_code !== 0)
          throw new Error(
            `PikPak login failed (${r.error_code}): ${r.error_description || r.error}`,
          )
        ;((this.accessToken = r.access_token),
          (this.refreshTokenVal = r.refresh_token),
          (this.userId = r.sub || ""),
          this.onTokenRefreshed &&
            (await this.onTokenRefreshed({
              accessToken: this.accessToken,
              refreshToken: this.refreshTokenVal,
              captchaToken: this.captchaTokenVal,
            })))
      }
      async refreshToken() {
        if (!this.refreshTokenVal) {
          await this.login()
          return
        }
        let r = await (
          await fetch(
            `https://user.mypikpak.net/v1/auth/token?client_id=${encodeURIComponent(this.clientId)}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "User-Agent": this.userAgent || "OpenListNext",
                "X-Device-ID": this.deviceId,
              },
              body: JSON.stringify({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                grant_type: "refresh_token",
                refresh_token: this.refreshTokenVal,
              }),
            },
          )
        ).json()
        if (r.error_code && r.error_code !== 0) {
          if (r.error_code === 4126 && this.addition.username) {
            await this.login()
            return
          }
          throw new Error(
            `PikPak token refresh failed (${r.error_code}): ${r.error_description || r.error}`,
          )
        }
        ;((this.accessToken = r.access_token),
          (this.refreshTokenVal = r.refresh_token),
          (this.userId = r.sub || ""),
          this.onTokenRefreshed &&
            (await this.onTokenRefreshed({
              accessToken: this.accessToken,
              refreshToken: this.refreshTokenVal,
              captchaToken: this.captchaTokenVal,
            })))
      }
      async init() {
        ;(this.addition.platform === "android" &&
          (this.userAgent = await r0(
            this.deviceId,
            this.clientId,
            this.packageName,
            this.sdkVersion,
            this.clientVersion,
            this.packageName,
            this.userId,
          )),
          this.refreshTokenVal ? await this.refreshToken() : await this.login())
        try {
          await this.refreshCaptchaTokenAtLogin(
            Fo("GET", "https://api-drive.mypikpak.net/drive/v1/files"),
            this.userId,
          )
        } catch (e) {
          console.warn("[PikPak] post-login captcha init warning:", e)
        }
        this.addition.platform === "android" &&
          (this.userAgent = await r0(
            this.deviceId,
            this.clientId,
            this.packageName,
            this.sdkVersion,
            this.clientVersion,
            this.packageName,
            this.userId,
          ))
      }
      async request(e, t = {}) {
        let { method: r = "GET", params: s, body: n, retryCount: o = 0 } = t,
          a = e
        if (s && Object.keys(s).length > 0) {
          let p = new URLSearchParams(s).toString()
          a += (e.includes("?") ? "&" : "?") + p
        }
        let c = {
          "User-Agent": this.userAgent || "OpenListNext",
          "X-Device-ID": this.deviceId,
        }
        ;(this.captchaTokenVal && (c["X-Captcha-Token"] = this.captchaTokenVal),
          this.accessToken && (c.Authorization = `Bearer ${this.accessToken}`),
          n &&
            typeof n == "object" &&
            !(n instanceof Uint8Array) &&
            (c["Content-Type"] = "application/json"))
        let d = await fetch(a, {
            method: r,
            headers: c,
            body:
              n && typeof n == "object" && !(n instanceof Uint8Array)
                ? JSON.stringify(n)
                : n,
          }),
          l = await d.text(),
          u = {}
        try {
          u = JSON.parse(l)
        } catch {
          u = l
        }
        if (u && typeof u == "object" && u.error_code) {
          let p = u.error_code
          if ((p === 4122 || p === 4121 || p === 16) && o < 2)
            return (
              await this.refreshToken(),
              this.request(e, { ...t, retryCount: o + 1 })
            )
          if (p === 9 && o < 2)
            return (
              await this.refreshCaptchaTokenAtLogin(Fo(r, e), this.userId),
              this.request(e, { ...t, retryCount: o + 1 })
            )
          throw new Error(
            `PikPak API Error (${p}): ${u.error_description || u.error || JSON.stringify(u)}`,
          )
        }
        if (!d.ok)
          throw new Error(`PikPak request failed with status ${d.status}: ${l}`)
        return u
      }
    }
  })
var Gs,
  s0 = R(() => {
    "use strict"
    ee()
    ie()
    yt()
    i0()
    Gs = class {
      addition
      client
      rootId = ""
      idCache = new Map()
      constructor(e, t) {
        ;((this.addition = e),
          (this.rootId = e.root_folder_id || ""),
          (this.client = new Ks(e, t)))
      }
      async init() {
        await this.client.init()
      }
      cleanPath(e) {
        let t = "/" + (e || "").split("/").filter(Boolean).join("/")
        return t === "/" ? "" : t
      }
      async resolveParentId(e) {
        let t = this.cleanPath(e)
        if (!t) return this.rootId
        if (this.idCache.has(t)) return this.idCache.get(t)
        let r = t.split("/").filter(Boolean),
          s = this.rootId,
          n = ""
        for (let o of r) {
          if (((n += "/" + o), this.idCache.has(n))) {
            s = this.idCache.get(n)
            continue
          }
          let c = (await this.getFiles(s)).find((d) => d.name === o)
          if (!c) throw new Error(`Path not found: ${n}`)
          ;((s = c.id), this.idCache.set(n, s))
        }
        return s
      }
      async getFiles(e) {
        let t = [],
          r = ""
        for (;;) {
          let s = {
            parent_id: e,
            thumbnail_size: "SIZE_LARGE",
            with_audit: "true",
            limit: "100",
            filters: JSON.stringify({
              phase: { eq: "PHASE_TYPE_COMPLETE" },
              trashed: { eq: !1 },
            }),
          }
          r && (s.page_token = r)
          let n = await this.client.request(
            "https://api-drive.mypikpak.net/drive/v1/files",
            { method: "GET", params: s },
          )
          if (
            (n.files && n.files.length > 0 && t.push(...n.files),
            !n.next_page_token || n.next_page_token === r)
          )
            break
          r = n.next_page_token
        }
        return t
      }
      async list(e, t) {
        let r = await this.resolveParentId(t),
          s = await this.getFiles(r),
          n = this.cleanPath(t),
          o = s.map((a) => {
            let c = a.kind === "drive#folder",
              d = n ? `${n}/${a.name}` : `/${a.name}`
            this.idCache.set(d, a.id)
            let l = a.web_content_link || ""
            return (
              !this.addition.disable_media_link &&
                a.medias &&
                a.medias.length > 0 &&
                a.medias[0].link?.url &&
                (l = a.medias[0].link.url),
              {
                name: a.name,
                size: parseInt(a.size || "0", 10) || 0,
                is_dir: c,
                created: a.created_time,
                modified: a.modified_time || new Date().toISOString(),
                sign: a.id,
                type: z(a.name, c),
                thumb: a.thumbnail_link,
                raw_url: l,
              }
            )
          })
        return N(o, this.addition.order_by, this.addition.order_direction)
      }
      async get(e, t) {
        let r = this.cleanPath(t),
          s = r.split("/").pop() || "root"
        if (!r)
          return {
            name: "root",
            size: 0,
            is_dir: !0,
            modified: new Date().toISOString(),
            sign: this.rootId,
            type: 1,
            raw_url: "",
          }
        let n = await this.resolveParentId(t),
          o = {
            _magic: "2021",
            usage: this.addition.disable_media_link ? "FETCH" : "CACHE",
            thumbnail_size: "SIZE_LARGE",
          },
          a = await this.client.request(
            `https://api-drive.mypikpak.net/drive/v1/files/${encodeURIComponent(n)}`,
            { method: "GET", params: o },
          ),
          c = a.kind === "drive#folder",
          d = a.web_content_link || ""
        return (
          !this.addition.disable_media_link &&
            a.medias &&
            a.medias.length > 0 &&
            a.medias[0].link?.url &&
            (d = a.medias[0].link.url),
          {
            name: a.name || s,
            size: parseInt(a.size || "0", 10) || 0,
            is_dir: c,
            created: a.created_time,
            modified: a.modified_time || new Date().toISOString(),
            sign: a.id,
            type: z(a.name || s, c),
            thumb: a.thumbnail_link,
            raw_url: d,
          }
        )
      }
      async mkdir(e, t) {
        let r = this.cleanPath(t),
          s = r.split("/").slice(0, -1).join("/"),
          n = r.split("/").pop() || "",
          o = await this.resolveParentId(s),
          a = await this.client.request(
            "https://api-drive.mypikpak.net/drive/v1/files",
            {
              method: "POST",
              body: { kind: "drive#folder", parent_id: o, name: n },
            },
          )
        a?.file?.id && this.idCache.set(r, a.file.id)
      }
      async rename(e, t, r) {
        let s = await this.resolveParentId(t)
        await this.client.request(
          `https://api-drive.mypikpak.net/drive/v1/files/${encodeURIComponent(s)}`,
          { method: "PATCH", body: { name: r } },
        )
        let n = this.cleanPath(t)
        this.idCache.delete(n)
      }
      async remove(e, t, r) {
        let s = await this.resolveParentId(t),
          n = await this.getFiles(s),
          o = []
        for (let c of r) {
          let d = n.find((l) => l.name === c)
          d && o.push(d.id)
        }
        if (o.length === 0) return
        await this.client.request(
          "https://api-drive.mypikpak.net/drive/v1/files:batchTrash",
          { method: "POST", body: { ids: o } },
        )
        let a = this.cleanPath(t)
        for (let c of r) this.idCache.delete(a ? `${a}/${c}` : `/${c}`)
      }
      async move(e, t, r, s, n) {
        let o = await this.resolveParentId(s),
          a = await this.resolveParentId(n),
          c = await this.getFiles(o),
          d = []
        for (let u of r) {
          let p = c.find((h) => h.name === u)
          p && d.push(p.id)
        }
        if (d.length === 0) return
        await this.client.request(
          "https://api-drive.mypikpak.net/drive/v1/files:batchMove",
          { method: "POST", body: { ids: d, to: { parent_id: a } } },
        )
        let l = this.cleanPath(s)
        for (let u of r) this.idCache.delete(l ? `${l}/${u}` : `/${u}`)
      }
      async copy(e, t, r, s, n) {
        let o = await this.resolveParentId(s),
          a = await this.resolveParentId(n),
          c = await this.getFiles(o),
          d = []
        for (let l of r) {
          let u = c.find((p) => p.name === l)
          u && d.push(u.id)
        }
        d.length !== 0 &&
          (await this.client.request(
            "https://api-drive.mypikpak.net/drive/v1/files:batchCopy",
            { method: "POST", body: { ids: d, to: { parent_id: a } } },
          ))
      }
      async put(e, t, r) {
        let s = this.cleanPath(t),
          n = s.split("/").slice(0, -1).join("/"),
          o = s.split("/").pop() || "upload",
          a = await this.resolveParentId(n),
          c = (await gt(new Uint8Array(r))).toUpperCase(),
          d = await this.client.request(
            "https://api-drive.mypikpak.net/drive/v1/files",
            {
              method: "POST",
              body: {
                kind: "drive#file",
                name: o,
                size: String(r.length),
                hash: c,
                upload_type: "UPLOAD_TYPE_RESUMABLE",
                objProvider: { provider: "UPLOAD_TYPE_UNKNOWN" },
                parent_id: a,
                folder_type: "NORMAL",
              },
            },
          )
        if (!d.resumable) return
        let l = d.resumable.params,
          u = l.endpoint
        this.addition.platform === "android" && (u = "mypikpak.net")
        let p = `https://${l.bucket}.${u}/${l.key}`,
          h = await fetch(p, {
            method: "PUT",
            headers: {
              "Content-Length": String(r.length),
              "x-oss-security-token": l.security_token,
            },
            body: new Uint8Array(r),
          })
        if (!h.ok) throw new Error(`PikPak OSS upload failed: ${h.statusText}`)
      }
      async getDetails() {
        let e = await this.client.request(
          "https://api-drive.mypikpak.net/drive/v1/about",
          { method: "GET" },
        )
        return {
          totalSpace: parseInt(e.quota.limit || "0", 10) || 0,
          usedSpace: parseInt(e.quota.usage || "0", 10) || 0,
        }
      }
    }
  })
var Vs,
  n0 = R(() => {
    "use strict"
    Vs = class {
      addition
      address
      authorization = ""
      onTokenRefreshed
      decryptedRepos = new Map()
      constructor(e, t) {
        ;((this.addition = e),
          (this.address = (e.address || "").replace(/\/+$/, "")),
          (this.onTokenRefreshed = t),
          e.token && (this.authorization = `Token ${e.token}`))
      }
      async getToken() {
        if (this.addition.token) {
          this.authorization = `Token ${this.addition.token}`
          return
        }
        if (!this.addition.username || !this.addition.password)
          throw new Error(
            "Seafile requires either token or username/password to authenticate",
          )
        let e = new URLSearchParams()
        ;(e.set("username", this.addition.username),
          e.set("password", this.addition.password))
        let t = await fetch(`${this.address}/api2/auth-token/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body: e.toString(),
        })
        if (!t.ok) {
          let s = await t.text()
          throw new Error(`Seafile auth failed (${t.status}): ${s}`)
        }
        let r = await t.json()
        ;((this.authorization = `Token ${r.token}`),
          (this.addition.token = r.token),
          this.onTokenRefreshed && (await this.onTokenRefreshed(r.token)))
      }
      async request(e, t = {}) {
        let {
            method: r = "GET",
            params: s,
            body: n,
            isFormData: o = !1,
            retryCount: a = 0,
          } = t,
          c = e.startsWith("http") ? e : `${this.address}${e}`
        if (s && Object.keys(s).length > 0) {
          let f = new URLSearchParams(s).toString()
          c += (c.includes("?") ? "&" : "?") + f
        }
        let d = { Accept: "application/json" }
        this.authorization && (d.Authorization = this.authorization)
        let l = n
        if (o && n && !(n instanceof FormData)) {
          let f = new URLSearchParams()
          for (let [g, w] of Object.entries(n)) f.set(g, String(w))
          ;((d["Content-Type"] = "application/x-www-form-urlencoded"),
            (l = f.toString()))
        } else
          n &&
            typeof n == "object" &&
            !(n instanceof FormData) &&
            !(n instanceof Uint8Array) &&
            ((d["Content-Type"] = "application/json"), (l = JSON.stringify(n)))
        let u = await fetch(c, { method: r, headers: d, body: l })
        if (u.status === 401 && a < 1)
          return (
            await this.getToken(),
            this.request(e, { ...t, retryCount: a + 1 })
          )
        if (!u.ok) {
          let f = await u.text()
          throw new Error(`Seafile request failed (${u.status}): ${f}`)
        }
        return (u.headers.get("content-type") || "").includes(
          "application/json",
        )
          ? await u.json()
          : await u.text()
      }
      async getLibraryInfo(e) {
        return this.request(`/api2/repos/${e}/`)
      }
      async decryptLibrary(e) {
        if (!e.encrypted) return
        if (!this.addition.repo_pwd)
          throw new Error(
            "Seafile encrypted library password (repo_pwd) is not configured",
          )
        let t = this.decryptedRepos.get(e.id) || 0
        if (Date.now() - t < 1800 * 1e3) return
        let r = await this.request(`/api2/repos/${e.id}/`, {
          method: "POST",
          isFormData: !0,
          body: { password: this.addition.repo_pwd },
        })
        if (typeof r == "string" && !r.includes("success"))
          throw new Error(`Failed to decrypt Seafile library: ${r}`)
        this.decryptedRepos.set(e.id, Date.now())
      }
    }
  })
var Js,
  o0 = R(() => {
    "use strict"
    ee()
    ie()
    n0()
    Js = class {
      addition
      client
      repoId
      rootPath = "/"
      constructor(e, t) {
        ;((this.addition = e),
          (this.repoId = e.repo_id || void 0),
          (this.client = new Vs(e, t)))
      }
      async init() {
        ;(await this.client.getToken(),
          (this.rootPath =
            "/" +
            (this.addition.root_folder_path || "/")
              .split("/")
              .filter(Boolean)
              .join("/")))
      }
      cleanPath(e) {
        let t = "/" + (e || "").split("/").filter(Boolean).join("/")
        return t === "/" ? "/" : t
      }
      async resolveRepoAndPath(e) {
        let t = this.cleanPath(e)
        if (this.repoId)
          return { repoId: this.repoId, innerPath: t, isRootListRepos: !1 }
        if (t === "/")
          return { repoId: "", innerPath: "/", isRootListRepos: !0 }
        let r = t.split("/").filter(Boolean),
          s = r[0],
          n = "/" + r.slice(1).join("/"),
          a = (await this.client.request("/api2/repos/")).find(
            (c) => c.name === s || c.id === s,
          )
        if (!a) throw new Error(`Seafile library '${s}' not found`)
        return (
          a.encrypted && (await this.client.decryptLibrary(a)),
          { repoId: a.id, innerPath: n === "/" ? "/" : n, isRootListRepos: !1 }
        )
      }
      async list(e, t) {
        let {
          repoId: r,
          innerPath: s,
          isRootListRepos: n,
        } = await this.resolveRepoAndPath(t)
        if (n) {
          let d = (await this.client.request("/api2/repos/")).map((l) => ({
            name: l.name,
            size: l.size || 0,
            is_dir: !0,
            modified: l.mtime
              ? new Date(l.mtime * 1e3).toISOString()
              : new Date().toISOString(),
            sign: l.id,
            type: 1,
            raw_url: "",
          }))
          return N(d, this.addition.order_by, this.addition.order_direction)
        }
        let a = (
          await this.client.request(
            `/api2/repos/${encodeURIComponent(r)}/dir/`,
            { params: { p: s } },
          )
        ).map((c) => {
          let d = c.type === "dir"
          return {
            name: c.name,
            size: c.size || 0,
            is_dir: d,
            modified: c.mtime
              ? new Date(c.mtime * 1e3).toISOString()
              : new Date().toISOString(),
            sign: c.id,
            type: z(c.name, d),
            raw_url: "",
          }
        })
        return N(a, this.addition.order_by, this.addition.order_direction)
      }
      async get(e, t) {
        let {
            repoId: r,
            innerPath: s,
            isRootListRepos: n,
          } = await this.resolveRepoAndPath(t),
          a = this.cleanPath(t).split("/").filter(Boolean).pop() || "root"
        if (n)
          return {
            name: "root",
            size: 0,
            is_dir: !0,
            modified: new Date().toISOString(),
            sign: "",
            type: 1,
            raw_url: "",
          }
        if (s === "/") {
          let u = await this.client.getLibraryInfo(r)
          return {
            name: u.name || a,
            size: u.size || 0,
            is_dir: !0,
            modified: u.mtime
              ? new Date(u.mtime * 1e3).toISOString()
              : new Date().toISOString(),
            sign: u.id,
            type: 1,
            raw_url: "",
          }
        }
        let c = ""
        try {
          let u = await this.client.request(
            `/api2/repos/${encodeURIComponent(r)}/file/`,
            { params: { p: s, reuse: "1" } },
          )
          typeof u == "string" && (c = u.replace(/^"|"$/g, "").trim())
        } catch {}
        let d = s.split("/").slice(0, -1).join("/") || "/",
          l = s.split("/").pop() || ""
        try {
          let p = (
            await this.client.request(
              `/api2/repos/${encodeURIComponent(r)}/dir/`,
              { params: { p: d } },
            )
          ).find((h) => h.name === l)
          if (p) {
            let h = p.type === "dir"
            return {
              name: p.name,
              size: p.size || 0,
              is_dir: h,
              modified: p.mtime
                ? new Date(p.mtime * 1e3).toISOString()
                : new Date().toISOString(),
              sign: p.id,
              type: z(p.name, h),
              raw_url: c,
            }
          }
        } catch {}
        return {
          name: a,
          size: 0,
          is_dir: !c,
          modified: new Date().toISOString(),
          sign: "",
          type: z(a, !c),
          raw_url: c,
        }
      }
      async mkdir(e, t) {
        let { repoId: r, innerPath: s } = await this.resolveRepoAndPath(t)
        await this.client.request(`/api2/repos/${encodeURIComponent(r)}/dir/`, {
          method: "POST",
          isFormData: !0,
          params: { p: s },
          body: { operation: "mkdir" },
        })
      }
      async rename(e, t, r) {
        let { repoId: s, innerPath: n } = await this.resolveRepoAndPath(t)
        await this.client.request(
          `/api2/repos/${encodeURIComponent(s)}/file/`,
          {
            method: "POST",
            isFormData: !0,
            params: { p: n },
            body: { operation: "rename", newname: r },
          },
        )
      }
      async remove(e, t, r) {
        let { repoId: s, innerPath: n } = await this.resolveRepoAndPath(t)
        for (let o of r) {
          let a = n === "/" ? `/${o}` : `${n}/${o}`
          await this.client.request(
            `/api2/repos/${encodeURIComponent(s)}/file/`,
            { method: "DELETE", params: { p: a } },
          )
        }
      }
      async move(e, t, r, s, n) {
        let o = await this.resolveRepoAndPath(s),
          a = await this.resolveRepoAndPath(n)
        for (let c of r) {
          let d = o.innerPath === "/" ? `/${c}` : `${o.innerPath}/${c}`
          await this.client.request(
            `/api2/repos/${encodeURIComponent(o.repoId)}/file/`,
            {
              method: "POST",
              isFormData: !0,
              params: { p: d },
              body: {
                operation: "move",
                dst_repo: a.repoId,
                dst_dir: a.innerPath,
              },
            },
          )
        }
      }
      async copy(e, t, r, s, n) {
        let o = await this.resolveRepoAndPath(s),
          a = await this.resolveRepoAndPath(n)
        for (let c of r) {
          let d = o.innerPath === "/" ? `/${c}` : `${o.innerPath}/${c}`
          await this.client.request(
            `/api2/repos/${encodeURIComponent(o.repoId)}/file/`,
            {
              method: "POST",
              isFormData: !0,
              params: { p: d },
              body: {
                operation: "copy",
                dst_repo: a.repoId,
                dst_dir: a.innerPath,
              },
            },
          )
        }
      }
      async put(e, t, r) {
        let { repoId: s, innerPath: n } = await this.resolveRepoAndPath(t),
          o = n.split("/").slice(0, -1).join("/") || "/",
          a = n.split("/").pop() || "upload",
          d = (
            (await this.client.request(
              `/api2/repos/${encodeURIComponent(s)}/upload-link/`,
              { params: { p: o } },
            )) || ""
          )
            .replace(/^"|"$/g, "")
            .trim()
        if (!d) throw new Error("Failed to get Seafile upload link")
        let l = new FormData()
        ;(l.append("parent_dir", o),
          l.append("replace", "1"),
          l.append(
            "file",
            new Blob([new Uint8Array(r)], { type: "application/octet-stream" }),
            a,
          ),
          await this.client.request(d, { method: "POST", body: l }))
      }
    }
  })
var Qs,
  a0 = R(() => {
    "use strict"
    Qs = class {
      addition
      accessToken = ""
      refreshTokenVal = ""
      onTokenRefreshed
      constructor(e, t) {
        ;((this.addition = e),
          (this.refreshTokenVal = e.refresh_token || ""),
          (this.onTokenRefreshed = t))
      }
      async refreshToken() {
        if (this.addition.use_online_api !== !1) {
          let n = `${this.addition.api_url_address || "https://api.oplist.org/yandexui/renewapi"}?refresh_ui=${encodeURIComponent(this.refreshTokenVal)}&server_use=true&driver_txt=yandexui_go`,
            o = await fetch(n, {
              method: "GET",
              headers: { Accept: "application/json" },
            })
          if (!o.ok)
            throw new Error(
              `Failed to refresh Yandex token online: ${o.statusText}`,
            )
          let a = await o.json()
          if (!a.access_token)
            throw new Error(
              `Yandex online token refresh failed: ${a.text || "No access token returned"}`,
            )
          ;((this.accessToken = a.access_token),
            a.refresh_token &&
              ((this.refreshTokenVal = a.refresh_token),
              (this.addition.refresh_token = a.refresh_token)),
            this.onTokenRefreshed &&
              (await this.onTokenRefreshed({
                accessToken: this.accessToken,
                refreshToken: this.refreshTokenVal,
              })))
          return
        }
        if (!this.addition.client_id || !this.addition.client_secret)
          throw new Error(
            "Yandex Disk requires client_id and client_secret when online API is disabled",
          )
        let e = new URLSearchParams()
        ;(e.set("grant_type", "refresh_token"),
          e.set("refresh_token", this.refreshTokenVal),
          e.set("client_id", this.addition.client_id),
          e.set("client_secret", this.addition.client_secret))
        let t = await fetch("https://oauth.yandex.com/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body: e.toString(),
        })
        if (!t.ok) {
          let s = await t.text()
          throw new Error(`Yandex OAuth refresh failed (${t.status}): ${s}`)
        }
        let r = await t.json()
        ;((this.accessToken = r.access_token),
          (this.refreshTokenVal = r.refresh_token),
          (this.addition.refresh_token = r.refresh_token),
          this.onTokenRefreshed &&
            (await this.onTokenRefreshed({
              accessToken: this.accessToken,
              refreshToken: this.refreshTokenVal,
            })))
      }
      async init() {
        await this.refreshToken()
      }
      async request(e, t = {}) {
        let { method: r = "GET", params: s, body: n, retryCount: o = 0 } = t,
          a = e.startsWith("http")
            ? e
            : `https://cloud-api.yandex.net/v1/disk/resources${e}`
        if (s && Object.keys(s).length > 0) {
          let u = new URLSearchParams(s).toString()
          a += (a.includes("?") ? "&" : "?") + u
        }
        let c = {
          Accept: "application/json",
          Authorization: `OAuth ${this.accessToken}`,
        }
        n &&
          typeof n == "object" &&
          !(n instanceof Uint8Array) &&
          (c["Content-Type"] = "application/json")
        let d = await fetch(a, {
          method: r,
          headers: c,
          body:
            n && typeof n == "object" && !(n instanceof Uint8Array)
              ? JSON.stringify(n)
              : n,
        })
        if (d.status === 401 && o < 1)
          return (
            await this.refreshToken(),
            this.request(e, { ...t, retryCount: o + 1 })
          )
        if (!d.ok) {
          let u = await d.text(),
            p = u
          try {
            let h = JSON.parse(u)
            p = h.message || h.description || u
          } catch {}
          throw new Error(`Yandex Disk API Error (${d.status}): ${p}`)
        }
        return (d.headers.get("content-type") || "").includes(
          "application/json",
        )
          ? await d.json()
          : await d.text()
      }
      async getFiles(e, t, r) {
        let n = 0,
          o = []
        for (;;) {
          let a = { path: e || "/", limit: String(100), offset: String(n) }
          t && (a.sort = r === "desc" ? `-${t}` : t)
          let d = (await this.request("", { method: "GET", params: a }))
            ._embedded
          if (
            !d ||
            !d.items ||
            (o.push(...d.items), d.total <= n + 100 || d.items.length === 0)
          )
            break
          n += 100
        }
        return o
      }
      async getDownloadLink(e) {
        return (
          await this.request("/download", {
            method: "GET",
            params: { path: e },
          })
        ).href
      }
      async getUploadLink(e) {
        return (
          await this.request("/upload", {
            method: "GET",
            params: { path: e, overwrite: "true" },
          })
        ).href
      }
    }
  })
var Xs,
  c0 = R(() => {
    "use strict"
    ee()
    ie()
    a0()
    Xs = class {
      addition
      client
      constructor(e, t) {
        ;((this.addition = e), (this.client = new Qs(e, t)))
      }
      async init() {
        await this.client.init()
      }
      cleanPath(e) {
        let t = "/" + (e || "").split("/").filter(Boolean).join("/")
        return t === "/" ? "/" : t
      }
      async list(e, t) {
        let r = this.cleanPath(t),
          n = (
            await this.client.getFiles(
              r,
              this.addition.order_by,
              this.addition.order_direction,
            )
          ).map((o) => {
            let a = o.type === "dir"
            return {
              name: o.name,
              size: o.size || 0,
              is_dir: a,
              created: o.created,
              modified: o.modified || new Date().toISOString(),
              sign: o.path || o.name,
              type: z(o.name, a),
              thumb: o.preview,
              raw_url: "",
            }
          })
        return N(n, this.addition.order_by, this.addition.order_direction)
      }
      async get(e, t) {
        let r = this.cleanPath(t),
          s = r.split("/").filter(Boolean).pop() || "root"
        if (r === "/")
          return {
            name: "root",
            size: 0,
            is_dir: !0,
            modified: new Date().toISOString(),
            sign: "/",
            type: 1,
            raw_url: "",
          }
        let n = await this.client.request("", {
            method: "GET",
            params: { path: r },
          }),
          o = n.type === "dir",
          a = ""
        if (!o)
          try {
            a = await this.client.getDownloadLink(r)
          } catch (c) {
            console.warn("[Yandex] get download link failed:", c)
          }
        return {
          name: n.name || s,
          size: n.size || 0,
          is_dir: o,
          created: n.created,
          modified: n.modified || new Date().toISOString(),
          sign: n.path || r,
          type: z(n.name || s, o),
          raw_url: a,
        }
      }
      async mkdir(e, t) {
        let r = this.cleanPath(t)
        await this.client.request("", { method: "PUT", params: { path: r } })
      }
      async rename(e, t, r) {
        let s = this.cleanPath(t),
          n = s.split("/").slice(0, -1).join("/") || "/",
          o = n === "/" ? `/${r}` : `${n}/${r}`
        await this.client.request("/move", {
          method: "POST",
          params: { from: s, path: o, overwrite: "true" },
        })
      }
      async remove(e, t, r) {
        let s = this.cleanPath(t)
        for (let n of r) {
          let o = s === "/" ? `/${n}` : `${s}/${n}`
          await this.client.request("", {
            method: "DELETE",
            params: { path: o },
          })
        }
      }
      async move(e, t, r, s, n) {
        let o = this.cleanPath(s),
          a = this.cleanPath(n)
        for (let c of r) {
          let d = o === "/" ? `/${c}` : `${o}/${c}`,
            l = a === "/" ? `/${c}` : `${a}/${c}`
          await this.client.request("/move", {
            method: "POST",
            params: { from: d, path: l, overwrite: "true" },
          })
        }
      }
      async copy(e, t, r, s, n) {
        let o = this.cleanPath(s),
          a = this.cleanPath(n)
        for (let c of r) {
          let d = o === "/" ? `/${c}` : `${o}/${c}`,
            l = a === "/" ? `/${c}` : `${a}/${c}`
          await this.client.request("/copy", {
            method: "POST",
            params: { from: d, path: l, overwrite: "true" },
          })
        }
      }
      async put(e, t, r) {
        let s = this.cleanPath(t),
          n = await this.client.getUploadLink(s),
          o = await fetch(n, {
            method: "PUT",
            headers: {
              "Content-Length": String(r.length),
              "Content-Type": "application/octet-stream",
            },
            body: new Uint8Array(r),
          })
        if (!o.ok) throw new Error(`Yandex upload failed: ${o.statusText}`)
      }
    }
  })
function fg(i, e) {
  let t = new Array(256),
    r = new Array(256),
    s = [],
    n = i.length
  for (let d = 0; d < 256; d++) ((t[d] = i.charCodeAt(d % n)), (r[d] = d))
  let o = 0
  for (let d = 0; d < 256; d++) {
    o = (o + r[d] + t[d]) % 256
    let l = r[d]
    ;((r[d] = r[o]), (r[o] = l))
  }
  let a = 0
  o = 0
  for (let d = 0; d < e.length; d++) {
    ;((a = (a + 1) % 256), (o = (o + r[a]) % 256))
    let l = r[a]
    ;((r[a] = r[o]), (r[o] = l))
    let u = r[(r[a] + r[o]) % 256]
    s.push(e.charCodeAt(d) ^ u)
  }
  let c = ""
  for (let d of s) c += String.fromCharCode(d)
  return btoa(c)
}
var Ys,
  d0 = R(() => {
    "use strict"
    Ys = class {
      addition
      baseUrl = "https://www.terabox.com"
      urlDomainPrefix = "jp"
      jsToken = ""
      onCookieRefreshed
      constructor(e, t) {
        ;((this.addition = e), (this.onCookieRefreshed = t))
      }
      async resetJsToken() {
        let e = await fetch(this.baseUrl, {
          method: "GET",
          headers: {
            Cookie: this.addition.cookie,
            Accept: "application/json, text/plain, */*",
            Referer: this.baseUrl,
            "User-Agent":
              "terabox;1.37.0.7;PC;PC-Windows;10.0.22631;WindowsTeraBox",
            "X-Requested-With": "XMLHttpRequest",
          },
        })
        if (!e.ok)
          throw new Error(`Failed to fetch TeraBox home page: ${e.statusText}`)
        let t = await e.text(),
          r = t.match(
            /`function%20fn%28a%29%7Bwindow.jsToken%20%3D%20a%7D%3Bfn%28%22([^"]+?)%22%29`/,
          )
        if (r && r[1]) {
          this.jsToken = r[1]
          return
        }
        let s = t.match(/jsToken\s*=\s*["']([^"']+)["']/)
        if (s && s[1]) {
          this.jsToken = s[1]
          return
        }
        this.jsToken = ""
      }
      async request(e, t = {}) {
        let {
            method: r = "GET",
            params: s,
            body: n,
            isFormData: o = !1,
            retryCount: a = 0,
          } = t,
          c = e.startsWith("http") ? e : `${this.baseUrl}${e}`,
          d = {
            app_id: "250528",
            web: "1",
            channel: "dubox",
            clienttype: "0",
            ...(s || {}),
          }
        this.jsToken && (d.jsToken = this.jsToken)
        let l = new URLSearchParams(d).toString()
        c += (c.includes("?") ? "&" : "?") + l
        let u = {
            Cookie: this.addition.cookie,
            Accept: "application/json, text/plain, */*",
            Referer: this.baseUrl,
            "User-Agent":
              "terabox;1.37.0.7;PC;PC-Windows;10.0.22631;WindowsTeraBox",
            "X-Requested-With": "XMLHttpRequest",
          },
          p = n
        if (o && n && !(n instanceof FormData)) {
          let w = new URLSearchParams()
          for (let [m, y] of Object.entries(n)) w.set(m, String(y))
          ;((u["Content-Type"] = "application/x-www-form-urlencoded"),
            (p = w.toString()))
        } else
          n &&
            typeof n == "object" &&
            !(n instanceof FormData) &&
            !(n instanceof Uint8Array) &&
            ((u["Content-Type"] = "application/json"), (p = JSON.stringify(n)))
        let h = await fetch(c, { method: r, headers: u, body: p }),
          f = await h.text(),
          g = {}
        try {
          g = JSON.parse(f)
        } catch {
          g = f
        }
        if (g && typeof g == "object" && g.errno !== void 0) {
          let w = Number(g.errno)
          if ((w === 4000023 || w === 450016) && a < 2)
            return (
              await this.resetJsToken(),
              this.request(e, { ...t, retryCount: a + 1 })
            )
          if (w === -6 && a < 2) {
            let m = h.headers.get("url-domain-prefix")
            if (m)
              return (
                (this.urlDomainPrefix = m),
                (this.baseUrl = `https://${m}.terabox.com`),
                this.request(e, { ...t, retryCount: a + 1 })
              )
          }
        }
        return g
      }
      async init() {
        let e = await this.request("/api/check/login", { method: "GET" })
        if (e.errno !== 0)
          throw e.errno === 9e3
            ? new Error(
                "TeraBox is not yet available in this area (errno 9000)",
              )
            : new Error(
                `Failed to verify TeraBox login status according to cookie (errno ${e.errno})`,
              )
      }
      async genSign() {
        let e = await this.request("/api/home/info", { method: "GET" })
        if (!e.data || !e.data.sign1 || !e.data.sign3)
          throw new Error("Failed to get TeraBox sign keys from home/info")
        return fg(e.data.sign3, e.data.sign1)
      }
      async linkOfficial(e) {
        let t = await this.genSign(),
          r = {
            type: "dlink",
            fidlist: `[${e}]`,
            sign: t,
            vip: "2",
            timestamp: String(Math.floor(Date.now() / 1e3)),
          },
          s = await this.request("/api/download", { method: "GET", params: r })
        if (!s.dlink || s.dlink.length === 0)
          throw new Error(`TeraBox fid ${e} no dlink found (errno: ${s.errno})`)
        let n = s.dlink[0].dlink
        return (
          (
            await fetch(n, {
              method: "GET",
              redirect: "manual",
              headers: {
                Cookie: this.addition.cookie,
                "User-Agent":
                  "terabox;1.37.0.7;PC;PC-Windows;10.0.22631;WindowsTeraBox",
              },
            })
          ).headers.get("location") || n
        )
      }
      async linkCrack(e) {
        let t = { target: JSON.stringify([e]), dlink: "1", origin: "dlna" },
          r = await this.request("/api/filemetas", { method: "GET", params: t })
        if (!r.info || r.info.length === 0 || !r.info[0].dlink)
          throw new Error(`TeraBox crack download failed for ${e}`)
        return r.info[0].dlink
      }
      async manage(e, t) {
        let r = new URLSearchParams()
        return (
          r.set("async", "0"),
          r.set("filelist", JSON.stringify(t)),
          r.set("ondup", "newcopy"),
          this.request("/api/filemanager", {
            method: "POST",
            params: { onnest: "fail", opera: e },
            isFormData: !0,
            body: { async: "0", filelist: JSON.stringify(t), ondup: "newcopy" },
          })
        )
      }
    }
  })
var Zs,
  l0 = R(() => {
    "use strict"
    ee()
    ie()
    yt()
    d0()
    Zs = class {
      addition
      client
      constructor(e, t) {
        ;((this.addition = e), (this.client = new Ys(e, t)))
      }
      async init() {
        await this.client.init()
      }
      cleanPath(e) {
        let t = "/" + (e || "").split("/").filter(Boolean).join("/")
        return t === "/" ? "/" : t
      }
      async list(e, t) {
        let r = this.cleanPath(t),
          s = [],
          n = 1,
          o = 100
        for (;;) {
          let c = { dir: r, page: String(n), num: String(o) }
          this.addition.order_by &&
            ((c.order = this.addition.order_by),
            this.addition.order_direction === "desc" && (c.desc = "1"))
          let d = await this.client.request("/api/list", {
            method: "GET",
            params: c,
          })
          if (d.errno === 9e3)
            throw new Error("TeraBox is not yet available in this area")
          if (!d.list || d.list.length === 0) break
          ;(s.push(...d.list), n++)
        }
        let a = s.map((c) => {
          let d = c.isdir === 1
          return {
            name: c.server_filename,
            size: c.size || 0,
            is_dir: d,
            modified: c.server_mtime
              ? new Date(c.server_mtime * 1e3).toISOString()
              : new Date().toISOString(),
            sign: String(c.fs_id),
            type: z(c.server_filename, d),
            thumb: c.thumbs?.url3,
            raw_url: "",
          }
        })
        return N(a, this.addition.order_by, this.addition.order_direction)
      }
      async get(e, t) {
        let r = this.cleanPath(t),
          s = r.split("/").filter(Boolean).pop() || "root"
        if (r === "/")
          return {
            name: "root",
            size: 0,
            is_dir: !0,
            modified: new Date().toISOString(),
            sign: "",
            type: 1,
            raw_url: "",
          }
        let n = r.split("/").slice(0, -1).join("/") || "/",
          o = r.split("/").pop() || "",
          c = (
            await this.client.request("/api/list", {
              method: "GET",
              params: { dir: n, page: "1", num: "1000" },
            })
          ).list?.find((u) => u.server_filename === o)
        if (!c)
          return {
            name: s,
            size: 0,
            is_dir: !1,
            modified: new Date().toISOString(),
            sign: "",
            type: 0,
            raw_url: "",
          }
        let d = c.isdir === 1,
          l = ""
        if (!d)
          try {
            this.addition.download_api === "crack"
              ? (l = await this.client.linkCrack(r))
              : (l = await this.client.linkOfficial(c.fs_id))
          } catch (u) {
            console.warn("[TeraBox] get download link failed:", u)
          }
        return {
          name: c.server_filename,
          size: c.size || 0,
          is_dir: d,
          modified: c.server_mtime
            ? new Date(c.server_mtime * 1e3).toISOString()
            : new Date().toISOString(),
          sign: String(c.fs_id),
          type: z(c.server_filename, d),
          thumb: c.thumbs?.url3,
          raw_url: l,
          raw_url_headers: {
            "User-Agent":
              "terabox;1.37.0.7;PC;PC-Windows;10.0.22631;WindowsTeraBox",
          },
        }
      }
      async mkdir(e, t) {
        let r = this.cleanPath(t)
        await this.client.request("/api/create", {
          method: "POST",
          isFormData: !0,
          params: { a: "commit" },
          body: { path: r, isdir: "1", block_list: "[]" },
        })
      }
      async rename(e, t, r) {
        let s = this.cleanPath(t)
        await this.client.manage("rename", [{ path: s, newname: r }])
      }
      async remove(e, t, r) {
        let s = this.cleanPath(t),
          n = r.map((o) => (s === "/" ? `/${o}` : `${s}/${o}`))
        await this.client.manage("delete", n)
      }
      async move(e, t, r, s, n) {
        let o = this.cleanPath(s),
          a = this.cleanPath(n),
          c = r.map((d) => ({
            path: o === "/" ? `/${d}` : `${o}/${d}`,
            dest: a,
            newname: d,
          }))
        await this.client.manage("move", c)
      }
      async copy(e, t, r, s, n) {
        let o = this.cleanPath(s),
          a = this.cleanPath(n),
          c = r.map((d) => ({
            path: o === "/" ? `/${d}` : `${o}/${d}`,
            dest: a,
            newname: d,
          }))
        await this.client.manage("copy", c)
      }
      async put(e, t, r) {
        let s = this.cleanPath(t),
          n = s.split("/").slice(0, -1).join("/") || "/",
          o = s.split("/").pop() || "upload",
          d =
            (
              await (
                await fetch(
                  "https://jp-data.terabox.com/rest/2.0/pcs/file?method=locateupload",
                )
              ).json()
            ).host || "d.terabox.com",
          l = Ve(new Uint8Array(r)),
          u = {
            path: s,
            autoinit: "1",
            target_path: n,
            block_list: JSON.stringify([l]),
            local_mtime: String(Math.floor(Date.now() / 1e3)),
            file_limit_switch_v34: "true",
          },
          p = await this.client.request("/api/precreate", {
            method: "POST",
            isFormData: !0,
            body: u,
          })
        if (p.errno !== 0)
          throw new Error(`TeraBox precreate failed (errno: ${p.errno})`)
        if (p.return_type === 2) return
        let h = `https://${d}/rest/2.0/pcs/superfile2?method=upload&path=${encodeURIComponent(s)}&uploadid=${encodeURIComponent(p.uploadid)}&partseq=0`,
          f = new FormData()
        f.append(
          "file",
          new Blob([new Uint8Array(r)], { type: "application/octet-stream" }),
          o,
        )
        let g = await fetch(h, {
          method: "POST",
          headers: {
            Cookie: this.addition.cookie,
            "User-Agent":
              "terabox;1.37.0.7;PC;PC-Windows;10.0.22631;WindowsTeraBox",
          },
          body: f,
        })
        if (!g.ok)
          throw new Error(`TeraBox upload chunk failed: ${g.statusText}`)
        let w = {
          path: s,
          size: String(r.length),
          uploadid: p.uploadid,
          target_path: n,
          block_list: JSON.stringify([l]),
          local_mtime: String(Math.floor(Date.now() / 1e3)),
        }
        await this.client.request("/api/create", {
          method: "POST",
          isFormData: !0,
          params: { isdir: "0", rtype: "1" },
          body: w,
        })
      }
    }
  })
var en,
  u0 = R(() => {
    "use strict"
    en = class {
      addition
      constructor(e) {
        this.addition = e
      }
      async request(e, t = {}) {
        let { method: r = "GET", params: s, body: n } = t,
          o = e
        if (s && Object.keys(s).length > 0) {
          let u = new URLSearchParams(s).toString()
          o += (o.includes("?") ? "&" : "?") + u
        }
        let a = {
          Authorization: `Bearer ${this.addition.access_token}`,
          Accept: "application/json",
        }
        n &&
          typeof n == "object" &&
          !(n instanceof Uint8Array) &&
          (a["Content-Type"] = "application/json")
        let c = await fetch(o, {
            method: r,
            headers: a,
            body:
              n && typeof n == "object" && !(n instanceof Uint8Array)
                ? JSON.stringify(n)
                : n,
          }),
          d = await c.text(),
          l = {}
        try {
          l = JSON.parse(d)
        } catch {
          l = d
        }
        if (l && typeof l == "object" && l.status && l.status !== "SUCCESS")
          throw new Error(
            `MediaTrack API Error: ${l.message || JSON.stringify(l)}`,
          )
        if (!c.ok)
          throw new Error(`MediaTrack request failed (${c.status}): ${d}`)
        return l
      }
      async init() {
        await this.request("https://kayle.api.mediatrack.cn/users", {
          method: "GET",
        })
      }
      async getFiles(e) {
        let t = [],
          r = 1,
          s = ""
        for (
          this.addition.order_by &&
          (s = (this.addition.order_desc ? "-" : "") + this.addition.order_by);
          ;
        ) {
          let n = { page: String(r), size: "50" }
          s && (n.sort = s)
          let a =
            (
              await this.request(
                `https://jayce.api.mediatrack.cn/v4/assets/${encodeURIComponent(e)}/children`,
                { method: "GET", params: n },
              )
            ).data?.assets || []
          if (a.length === 0) break
          ;(t.push(...a), r++)
        }
        return t
      }
      async getDownloadUrl(e) {
        let t = this.addition.project_id || "",
          r = `https://kayn.api.mediatrack.cn/v1/download_token/asset?asset_id=${encodeURIComponent(e)}&source_type=project&password=&source_id=${encodeURIComponent(t)}`,
          n = (await this.request(r, { method: "GET" }))?.data?.token
        if (!n) throw new Error(`Failed to get download token for asset ${e}`)
        let o = `https://kayn.api.mediatrack.cn/v1/download/redirect?token=${encodeURIComponent(n)}`
        return (
          (await fetch(o, { method: "GET", redirect: "manual" })).headers.get(
            "location",
          ) || o
        )
      }
    }
  })
var tn,
  p0 = R(() => {
    "use strict"
    ee()
    ie()
    u0()
    tn = class {
      addition
      client
      rootId = ""
      idCache = new Map()
      constructor(e) {
        ;((this.addition = e),
          (this.rootId = e.root_folder_id || ""),
          (this.client = new en(e)))
      }
      async init() {
        await this.client.init()
      }
      cleanPath(e) {
        let t = "/" + (e || "").split("/").filter(Boolean).join("/")
        return t === "/" ? "" : t
      }
      async resolveParentId(e) {
        let t = this.cleanPath(e)
        if (!t) return this.rootId
        if (this.idCache.has(t)) return this.idCache.get(t)
        let r = t.split("/").filter(Boolean),
          s = this.rootId,
          n = ""
        for (let o of r) {
          if (((n += "/" + o), this.idCache.has(n))) {
            s = this.idCache.get(n)
            continue
          }
          let c = (await this.client.getFiles(s)).find((d) => d.title === o)
          if (!c) throw new Error(`Path not found: ${n}`)
          ;((s = c.id), this.idCache.set(n, s))
        }
        return s
      }
      async list(e, t) {
        let r = await this.resolveParentId(t),
          s = await this.client.getFiles(r),
          n = this.cleanPath(t),
          o = s.map((a) => {
            let c = !a.file,
              d = n ? `${n}/${a.title}` : `/${a.title}`
            this.idCache.set(d, a.id)
            let l = ""
            return (
              a.file &&
                a.file.cover &&
                (l = "https://nano.mtres.cn/" + a.file.cover),
              {
                name: a.title,
                size: parseInt(a.size || "0", 10) || 0,
                is_dir: c,
                created: a.created_at,
                modified: a.updated_at || new Date().toISOString(),
                sign: a.id,
                type: z(a.title, c),
                thumb: l,
                raw_url: "",
              }
            )
          })
        return N(
          o,
          this.addition.order_by,
          this.addition.order_desc ? "desc" : "asc",
        )
      }
      async get(e, t) {
        let r = this.cleanPath(t),
          s = r.split("/").pop() || "root"
        if (!r)
          return {
            name: "root",
            size: 0,
            is_dir: !0,
            modified: new Date().toISOString(),
            sign: this.rootId,
            type: 1,
            raw_url: "",
          }
        let n = r.split("/").slice(0, -1).join("/"),
          o = await this.resolveParentId(n),
          c = (await this.client.getFiles(o)).find((p) => p.title === s)
        if (!c)
          return {
            name: s,
            size: 0,
            is_dir: !1,
            modified: new Date().toISOString(),
            sign: "",
            type: 0,
            raw_url: "",
          }
        let d = !c.file,
          l = ""
        if (!d)
          try {
            l = await this.client.getDownloadUrl(c.id)
          } catch (p) {
            console.warn("[MediaTrack] get download URL failed:", p)
          }
        let u = ""
        return (
          c.file &&
            c.file.cover &&
            (u = "https://nano.mtres.cn/" + c.file.cover),
          {
            name: c.title,
            size: parseInt(c.size || "0", 10) || 0,
            is_dir: d,
            created: c.created_at,
            modified: c.updated_at || new Date().toISOString(),
            sign: c.id,
            type: z(c.title, d),
            thumb: u,
            raw_url: l,
          }
        )
      }
      async mkdir(e, t) {
        let r = this.cleanPath(t),
          s = r.split("/").slice(0, -1).join("/"),
          n = r.split("/").pop() || "",
          o = await this.resolveParentId(s)
        await this.client.request(
          `https://jayce.api.mediatrack.cn/v3/assets/${encodeURIComponent(o)}/children`,
          { method: "POST", body: { type: 1, title: n } },
        )
      }
      async rename(e, t, r) {
        let s = await this.resolveParentId(t)
        await this.client.request(
          `https://jayce.api.mediatrack.cn/v3/assets/${encodeURIComponent(s)}`,
          { method: "PUT", body: { title: r } },
        )
        let n = this.cleanPath(t)
        this.idCache.delete(n)
      }
      async remove(e, t, r) {
        let s = await this.resolveParentId(t),
          n = await this.client.getFiles(s),
          o = []
        for (let c of r) {
          let d = n.find((l) => l.title === c)
          d && o.push(d.id)
        }
        if (o.length === 0) return
        await this.client.request(
          "https://jayce.api.mediatrack.cn/v4/assets/batch/delete",
          { method: "DELETE", body: { origin_id: s, ids: o } },
        )
        let a = this.cleanPath(t)
        for (let c of r) this.idCache.delete(a ? `${a}/${c}` : `/${c}`)
      }
      async move(e, t, r, s, n) {
        let o = await this.resolveParentId(s),
          a = await this.resolveParentId(n),
          c = await this.client.getFiles(o),
          d = []
        for (let l of r) {
          let u = c.find((p) => p.title === l)
          u && d.push(u.id)
        }
        d.length !== 0 &&
          (await this.client.request(
            "https://jayce.api.mediatrack.cn/v4/assets/batch/move",
            { method: "POST", body: { parent_id: a, ids: d } },
          ))
      }
      async copy(e, t, r, s, n) {
        let o = await this.resolveParentId(s),
          a = await this.resolveParentId(n),
          c = await this.client.getFiles(o),
          d = []
        for (let l of r) {
          let u = c.find((p) => p.title === l)
          u && d.push(u.id)
        }
        d.length !== 0 &&
          (await this.client.request(
            "https://jayce.api.mediatrack.cn/v4/assets/batch/clone",
            { method: "POST", body: { parent_id: a, ids: d } },
          ))
      }
      async put(e, t, r) {
        let s = this.cleanPath(t),
          n = s.split("/").slice(0, -1).join("/"),
          o = s.split("/").pop() || "upload",
          a = await this.resolveParentId(n),
          d = `assets/${Math.random().toString(36).slice(2)}`,
          u = (
            await this.client.request(
              "https://jayce.api.mediatrack.cn/v3/storage/tokens/asset",
              { method: "GET", params: { src: d } },
            )
          ).data?.url
        ;(u &&
          (await fetch(u, {
            method: "PUT",
            headers: { "Content-Length": String(r.length) },
            body: new Uint8Array(r),
          })),
          await this.client.request(
            `https://jayce.api.mediatrack.cn/v3/assets/${encodeURIComponent(a)}/children`,
            {
              method: "POST",
              body: {
                category: 0,
                description: o,
                mime: "application/octet-stream",
                size: String(r.length),
                src: d,
                title: o,
                type: 0,
              },
            },
          ))
      }
    }
  })
var rn,
  h0 = R(() => {
    "use strict"
    ee()
    ie()
    rn = class {
      addition
      pathPairs = []
      rootOrder = []
      pathMap = new Map()
      constructor(e) {
        ;((this.addition = e), this.parsePaths())
      }
      cleanPath(e) {
        let t = "/" + (e || "").split("/").filter(Boolean).join("/")
        return t === "/" ? "/" : t
      }
      parsePaths() {
        let t = (this.addition.paths || "")
          .split(
            `
`,
          )
          .map((r) => r.trim())
          .filter(Boolean)
        ;((this.pathPairs = []), (this.rootOrder = []), this.pathMap.clear())
        for (let r of t) {
          let s = "/",
            n = r,
            o = r.indexOf(":")
          ;(o > 0 &&
            ((s = this.cleanPath(r.slice(0, o))), (n = r.slice(o + 1).trim())),
            (n = this.cleanPath(n)),
            this.pathPairs.push({ aliasSubPath: s, targetPath: n }),
            this.pathMap.has(s) ||
              (this.rootOrder.push(s), this.pathMap.set(s, [])),
            this.pathMap.get(s).push(n))
        }
      }
      async init() {
        this.parsePaths()
      }
      getTargetsForPath(e) {
        let t = this.cleanPath(e),
          r = []
        if (this.rootOrder.length === 1 && this.rootOrder[0] === "/") {
          let s = this.pathMap.get("/") || []
          for (let n of s) {
            let o = t === "/" ? n : `${n}${t}`
            r.push({ targetFullPath: this.cleanPath(o), subPath: t })
          }
          return r
        }
        for (let [s, n] of this.pathMap.entries())
          if (s === t)
            for (let o of n) r.push({ targetFullPath: o, subPath: "/" })
          else if (t.startsWith(s === "/" ? "/" : `${s}/`)) {
            let o = t.slice(s === "/" ? 0 : s.length)
            for (let a of n) {
              let c = o === "/" ? a : `${a}${o}`
              r.push({ targetFullPath: this.cleanPath(c), subPath: o })
            }
          }
        return r
      }
      async list(e, t) {
        let r = this.cleanPath(t),
          { listItems: s } = await Promise.resolve().then(() => (Pe(), at))
        if (r === "/" && this.rootOrder.length > 1) {
          let c = []
          for (let d of this.rootOrder) {
            let l = d.replace(/^\//, "").split("/")[0] || d
            c.some((u) => u.name === l) ||
              c.push({
                name: l,
                size: 0,
                is_dir: !0,
                modified: new Date().toISOString(),
                sign: d,
                type: 1,
                raw_url: "",
              })
          }
          return N(c, this.addition.order_by, this.addition.order_direction)
        }
        let n = this.getTargetsForPath(t)
        if (n.length === 0) return []
        let o = new Map()
        for (let c of n)
          try {
            let d = await s(c.targetFullPath)
            for (let l of d.content) o.has(l.name) || o.set(l.name, l)
          } catch (d) {
            console.warn(
              `[Alias] listing target ${c.targetFullPath} warning:`,
              d,
            )
          }
        let a = Array.from(o.values())
        return N(a, this.addition.order_by, this.addition.order_direction)
      }
      async get(e, t) {
        let r = this.cleanPath(t),
          s = r.split("/").filter(Boolean).pop() || "root"
        if (r === "/" && this.rootOrder.length > 1)
          return {
            name: "root",
            size: 0,
            is_dir: !0,
            modified: new Date().toISOString(),
            sign: "/",
            type: 1,
            raw_url: "",
          }
        let n = this.getTargetsForPath(t)
        if (n.length === 0)
          return {
            name: s,
            size: 0,
            is_dir: !1,
            modified: new Date().toISOString(),
            sign: "",
            type: z(s, !1),
            raw_url: "",
          }
        let { getItem: o } = await Promise.resolve().then(() => (Pe(), at))
        for (let a of n)
          try {
            let c = await o(a.targetFullPath)
            if (c?.item)
              return { ...c.item, raw_url: c.item.raw_url || c.rawUrl }
          } catch {}
        return {
          name: s,
          size: 0,
          is_dir: !1,
          modified: new Date().toISOString(),
          sign: "",
          type: z(s, !1),
          raw_url: "",
        }
      }
      async mkdir(e, t) {
        let r = this.getTargetsForPath(t)
        if (r.length === 0)
          throw new Error(`[Alias] no target found for path ${t}`)
        let { makeDirectory: s } = await Promise.resolve().then(
          () => (Pe(), at),
        )
        await s(r[0].targetFullPath)
      }
      async rename(e, t, r) {
        let s = this.getTargetsForPath(t)
        if (s.length === 0)
          throw new Error(`[Alias] no target found for path ${t}`)
        let { renameItem: n } = await Promise.resolve().then(() => (Pe(), at))
        await n(s[0].targetFullPath, r)
      }
      async remove(e, t, r) {
        let s = this.getTargetsForPath(t)
        if (s.length === 0) return
        let { removeItems: n } = await Promise.resolve().then(() => (Pe(), at))
        await n(s[0].targetFullPath, r)
      }
      async move(e, t, r, s, n) {
        let o = this.getTargetsForPath(s),
          a = this.getTargetsForPath(n)
        if (o.length === 0 || a.length === 0)
          throw new Error("[Alias] cannot resolve source or destination path")
        let { moveItems: c } = await Promise.resolve().then(() => (Pe(), at))
        await c(o[0].targetFullPath, a[0].targetFullPath, r)
      }
      async copy(e, t, r, s, n) {
        let o = this.getTargetsForPath(s),
          a = this.getTargetsForPath(n)
        if (o.length === 0 || a.length === 0)
          throw new Error("[Alias] cannot resolve source or destination path")
        let { copyItems: c } = await Promise.resolve().then(() => (Pe(), at))
        await c(o[0].targetFullPath, a[0].targetFullPath, r)
      }
      async put(e, t, r) {
        let s = this.getTargetsForPath(t)
        if (s.length === 0)
          throw new Error(`[Alias] no target found for upload path ${t}`)
        let { putItem: n } = await Promise.resolve().then(() => (Pe(), at))
        await n(s[0].targetFullPath, r)
      }
    }
  })
var f0 = {}
St(f0, { LocalDriver: () => Io })
async function bt() {
  if (typeof process < "u" && process.release?.name === "node" && !se)
    try {
      ;((se = await import("fs/promises")), (ue = await import("path")))
    } catch {}
}
var se,
  ue,
  Io,
  m0 = R(() => {
    "use strict"
    ee()
    ;((se = null), (ue = null))
    Io = class {
      async list(e, t) {
        if ((await bt(), !se || !ue))
          throw new Error("LocalDriver is not supported in Edge Runtime")
        let r = []
        try {
          r = await se.readdir(t, { withFileTypes: !0 })
        } catch {
          return []
        }
        return await Promise.all(
          r.map(async (n) => {
            let o = n.isDirectory(),
              a = 0,
              c = new Date()
            try {
              let d = await se.stat(ue.join(t, n.name))
              ;((a = d.size), (c = d.mtime))
            } catch {}
            return {
              name: n.name,
              size: o ? 0 : a,
              is_dir: o,
              created: c.toISOString(),
              modified: c.toISOString(),
              sign: "",
              type: z(n.name, o),
            }
          }),
        )
      }
      async get(e, t) {
        if ((await bt(), !se || !ue))
          throw new Error("LocalDriver is not supported in Edge Runtime")
        let r = await se.stat(t),
          s = r.isDirectory(),
          n =
            t
              .split(/[\\/]+/)
              .filter(Boolean)
              .pop() || "root"
        return {
          name: n,
          size: s ? 0 : r.size,
          is_dir: s,
          created: r.ctime?.toISOString() || r.mtime.toISOString(),
          modified: r.mtime.toISOString(),
          sign: "",
          type: z(n, s),
        }
      }
      async mkdir(e, t) {
        if ((await bt(), !se || !ue))
          throw new Error("LocalDriver is not supported in Edge Runtime")
        await se.mkdir(t, { recursive: !0 })
      }
      async rename(e, t, r) {
        if ((await bt(), !se || !ue))
          throw new Error("LocalDriver is not supported in Edge Runtime")
        let s = ue.join(ue.dirname(t), r)
        await se.rename(t, s)
      }
      async remove(e, t, r) {
        if ((await bt(), !se || !ue))
          throw new Error("LocalDriver is not supported in Edge Runtime")
        for (let s of r) {
          let n = ue.join(t, s)
          await se.rm(n, { recursive: !0, force: !0 })
        }
      }
      async move(e, t, r, s, n) {
        if ((await bt(), !se || !ue))
          throw new Error("LocalDriver is not supported in Edge Runtime")
        for (let o of r) {
          let a = ue.join(s, o),
            c = ue.join(n, o)
          ;(await se.mkdir(ue.dirname(c), { recursive: !0 }),
            await se.rename(a, c))
        }
      }
      async copy(e, t, r, s, n) {
        if ((await bt(), !se || !ue))
          throw new Error("LocalDriver is not supported in Edge Runtime")
        for (let o of r) {
          let a = ue.join(s, o),
            c = ue.join(n, o)
          ;(await se.mkdir(ue.dirname(c), { recursive: !0 }),
            await se.cp(a, c, { recursive: !0 }))
        }
      }
      async put(e, t, r) {
        if ((await bt(), !se || !ue))
          throw new Error("LocalDriver is not supported in Edge Runtime")
        ;(await se.mkdir(ue.dirname(t), { recursive: !0 }),
          await se.writeFile(t, r))
      }
    }
  })
async function mg() {
  if (typeof process > "u" || process.release?.name !== "node")
    throw new Error(
      "[SFTP] SFTP driver requires Node.js container runtime (raw TCP sockets not available in standard Edge isolates)",
    )
  if (!Ro)
    try {
      Ro = await import("ssh2")
    } catch (i) {
      throw new Error(`[SFTP] Failed to load ssh2 module: ${i.message}`)
    }
  return Ro
}
function g0(i) {
  let e = (i || "").trim()
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
  let r = parseInt(t[t.length - 1], 10)
  return isNaN(r)
    ? { host: e, port: 22 }
    : { host: t.slice(0, t.length - 1).join(":"), port: r || 22 }
}
var Ro,
  Nr,
  Bo = R(() => {
    "use strict"
    Ro = null
    Nr = class {
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
        let { Client: e } = await mg(),
          { host: t, port: r } = g0(this.addition.address),
          s = new e(),
          n = {
            host: t,
            port: r,
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
        return new Promise((r, s) => {
          t.readdir(e, (n, o) => {
            if (n) return s(n)
            r(o || [])
          })
        })
      }
      async stat(e) {
        let t = await this.getSFTP()
        return new Promise((r, s) => {
          t.stat(e, (n, o) => {
            if (n) return s(n)
            r(o)
          })
        })
      }
      async lstat(e) {
        let t = await this.getSFTP()
        return new Promise((r, s) => {
          t.lstat(e, (n, o) => {
            if (n) return s(n)
            r(o)
          })
        })
      }
      async readlink(e) {
        let t = await this.getSFTP()
        return new Promise((r, s) => {
          t.readlink(e, (n, o) => {
            if (n) return s(n)
            r(o)
          })
        })
      }
      async realpath(e) {
        let t = await this.getSFTP()
        return new Promise((r, s) => {
          t.realpath(e, (n, o) => {
            if (n) return s(n)
            r(o)
          })
        })
      }
      async mkdir(e) {
        let t = await this.getSFTP()
        return new Promise((r, s) => {
          t.mkdir(e, (n) => {
            if (n) return s(n)
            r()
          })
        })
      }
      async mkdirAll(e) {
        let t = e.replace(/\\/g, "/"),
          r = t.split("/").filter(Boolean),
          s = t.startsWith("/") ? "/" : ""
        for (let n of r) {
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
        let r = await this.getSFTP()
        return new Promise((s, n) => {
          r.rename(e, t, (o) => {
            if (o) return n(o)
            s()
          })
        })
      }
      async unlink(e) {
        let t = await this.getSFTP()
        return new Promise((r, s) => {
          t.unlink(e, (n) => {
            if (n) return s(n)
            r()
          })
        })
      }
      async rmdir(e) {
        let t = await this.getSFTP()
        return new Promise((r, s) => {
          t.rmdir(e, (n) => {
            if (n) return s(n)
            r()
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
          let r = await this.readdir(e)
          for (let s of r) {
            if (s.filename === "." || s.filename === "..") continue
            let n = `${e.replace(/\/+$/, "")}/${s.filename}`
            await this.removeRecursive(n)
          }
          await this.rmdir(e)
        } else await this.unlink(e)
      }
      async writeFile(e, t) {
        let r = await this.getSFTP()
        return new Promise((s, n) => {
          let o = r.createWriteStream(e)
          ;(o.on("error", n), o.on("finish", s), o.end(t))
        })
      }
      async readFile(e) {
        let t = await this.getSFTP()
        return new Promise((r, s) => {
          let n = t.createReadStream(e),
            o = []
          ;(n.on("data", (a) => o.push(a)),
            n.on("error", s),
            n.on("end", () => r(Buffer.concat(o))))
        })
      }
      async createReadStream(e, t) {
        return (await this.getSFTP()).createReadStream(e, t)
      }
    }
  })
function Uo(i) {
  let e = { ...(i || {}) }
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
function Ne(i) {
  return (
    "/" + (i || "").replace(/\\/g, "/").split("/").filter(Boolean).join("/")
  )
}
function y0(i) {
  let e = Ne(i),
    t = e.lastIndexOf("/")
  return t <= 0 ? "/" : e.slice(0, t)
}
function Bt(...i) {
  let e = i.map((t) => (t || "").replace(/\\/g, "/")).join("/")
  return Ne(e)
}
var sn,
  w0 = R(() => {
    "use strict"
    ee()
    Bo()
    sn = class {
      client
      addition
      constructor(e) {
        ;((this.addition = Uo(e)), (this.client = new Nr(this.addition)))
      }
      async init() {
        if (!this.addition.address || !this.addition.username)
          throw new Error("[SFTP] address and username are required")
        await this.client.getSFTP()
      }
      async fileToItem(e, t) {
        let r = e.filename
        if (r === "." || r === "..") return null
        let s = Bt(t, r),
          n = e.attrs?.mode || 0,
          o = (n & 61440) === 40960,
          a = (n & 61440) === 16384,
          c = e.attrs?.mtime
            ? new Date(e.attrs.mtime * 1e3).toISOString()
            : new Date().toISOString()
        if (!o)
          return {
            name: r,
            size: a ? 0 : e.attrs?.size || 0,
            is_dir: a,
            modified: c,
            sign: s,
            type: z(r, a),
            raw_url: "",
          }
        try {
          let d = await this.client.readlink(s)
          d.startsWith("/") || (d = Bt(t, d))
          let l = await this.client.stat(d),
            u = l.isDirectory()
          return {
            name: r,
            size: u ? 0 : l.size || 0,
            is_dir: u,
            modified: l.mtime ? new Date(l.mtime * 1e3).toISOString() : c,
            sign: s,
            type: z(r, u),
            raw_url: "",
          }
        } catch (d) {
          if (this.addition.ignore_symlink_error)
            return {
              name: r,
              size: 0,
              is_dir: !1,
              modified: c,
              sign: s,
              type: z(r, !1),
              raw_url: "",
            }
          throw d
        }
      }
      async list(e, t) {
        let r = Ne(t || this.addition.root_folder_path || "/"),
          s = await this.client.readdir(r),
          n = []
        for (let o of s) {
          let a = await this.fileToItem(o, r)
          a && n.push(a)
        }
        return n
      }
      async get(e, t) {
        let r = Ne(t || this.addition.root_folder_path || "/")
        if (r === "/" || r === Ne(this.addition.root_folder_path || "/"))
          return {
            name: "root",
            size: 0,
            is_dir: !0,
            modified: new Date().toISOString(),
            sign: r,
            type: 1,
            raw_url: "",
          }
        let s = await this.client.stat(r),
          n = s.isDirectory(),
          o = r.split("/").filter(Boolean).pop() || "root",
          a = s.mtime
            ? new Date(s.mtime * 1e3).toISOString()
            : new Date().toISOString()
        return {
          name: o,
          size: n ? 0 : s.size || 0,
          is_dir: n,
          modified: a,
          sign: r,
          type: z(o, n),
          raw_url: "",
        }
      }
      async mkdir(e, t) {
        let r = Ne(t)
        await this.client.mkdirAll(r)
      }
      async rename(e, t, r) {
        let s = Ne(t),
          n = Bt(y0(s), r)
        await this.client.rename(s, n)
      }
      async remove(e, t, r) {
        let s = Ne(t)
        if (r && r.length > 0)
          for (let n of r) await this.client.removeRecursive(Bt(s, n))
        else await this.client.removeRecursive(s)
      }
      async move(e, t, r, s, n) {
        if (r && r.length > 0)
          for (let o of r) {
            let a = Bt(s, o),
              c = Bt(n, o)
            await this.client.rename(a, c)
          }
        else {
          let o = s.split("/").filter(Boolean).pop() || "",
            a = Bt(t, o)
          await this.client.rename(Ne(s), a)
        }
      }
      async copy(e, t, r, s, n) {
        throw new Error("[SFTP] Copy not supported")
      }
      async put(e, t, r) {
        let s = Ne(t)
        ;(await this.client.mkdirAll(y0(s)), await this.client.writeFile(s, r))
      }
      async createReadStream(e, t) {
        let r = Ne(e)
        return this.client.createReadStream(r, t)
      }
    }
  })
var x0 = R(() => {
  "use strict"
})
var _0 = {}
St(_0, {
  SFTPClientWrapper: () => Nr,
  SFTPDriver: () => sn,
  normalizeSFTPAddition: () => Uo,
  parseAddress: () => g0,
})
var v0 = R(() => {
  "use strict"
  w0()
  x0()
  Bo()
})
function Mr(i) {
  let e = (i || "").trim().toLowerCase()
  return !e || e === "utf8" || e === "utf-8" ? "utf-8" : e
}
function $o(i, e) {
  let t = Mr(e)
  if (t === "utf-8") return Buffer.from(i, "utf-8")
  try {
    return nn ? nn.encode(i, t) : gr("iconv-lite").encode(i, t)
  } catch {
    return Buffer.from(i, "utf-8")
  }
}
function on(i, e) {
  let t = Mr(e),
    r = Buffer.isBuffer(i) ? i : Buffer.from(i)
  if (t === "utf-8") return r.toString("utf-8")
  try {
    return nn ? nn.decode(r, t) : gr("iconv-lite").decode(r, t)
  } catch {
    return r.toString("utf-8")
  }
}
var nn,
  qo = R(() => {
    "use strict"
    nn = null
  })
async function b0() {
  if (typeof process > "u" || process.release?.name !== "node")
    throw new Error(
      "[FTP] FTP driver requires Node.js container runtime (raw TCP sockets not available in standard Edge isolates)",
    )
  if (!Oo)
    try {
      Oo = await import("node:net")
    } catch (i) {
      throw new Error(`[FTP] Failed to load net module: ${i.message}`)
    }
  return Oo
}
async function gg() {
  if (!jo)
    try {
      jo = await import("node:stream")
    } catch (i) {
      throw new Error(`[FTP] Failed to load stream module: ${i.message}`)
    }
  return jo
}
function k0(i) {
  let e = (i || "").trim()
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
  let r = parseInt(t[t.length - 1], 10)
  return isNaN(r)
    ? { host: e, port: 21 }
    : { host: t.slice(0, t.length - 1).join(":"), port: r || 21 }
}
function P0(i, e) {
  let t = i.trim()
  if (!t) return null
  if (t.includes("type=") && t.includes(";")) {
    let n = t.split(";"),
      o = n[n.length - 1].trim()
    if (!o || o === "." || o === "..") return null
    let a = !1,
      c = 0,
      d = new Date()
    for (let l of n.slice(0, -1)) {
      let [u, p] = l.split("=").map((h) => h.trim().toLowerCase())
      if (u === "type") a = p === "dir" || p === "cdir" || p === "pdir"
      else if (u === "size") c = parseInt(p, 10) || 0
      else if (u === "modify" && p && p.length >= 14) {
        let h = parseInt(p.slice(0, 4), 10),
          f = parseInt(p.slice(4, 6), 10) - 1,
          g = parseInt(p.slice(6, 8), 10),
          w = parseInt(p.slice(8, 10), 10),
          m = parseInt(p.slice(10, 12), 10),
          y = parseInt(p.slice(12, 14), 10)
        d = new Date(Date.UTC(h, f, g, w, m, y))
      }
    }
    return { name: o, size: c, is_dir: a, modified: d }
  }
  let r = t.match(
    /^([bcdlps-])[rwxstST-]{9}\s+\d+\s+(?:\S+\s+){1,2}(\d+)\s+([A-Za-z]{3}\s+\d{1,2}\s+(?:\d{4}|\d{1,2}:\d{2}))\s+(.+)$/,
  )
  if (r) {
    let n = r[1],
      o = parseInt(r[2], 10) || 0,
      a = r[3],
      c = r[4]
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
var Oo,
  jo,
  Hr,
  zo = R(() => {
    "use strict"
    qo()
    ;((Oo = null), (jo = null))
    Hr = class {
      addition
      controlSocket = null
      host
      port
      encoding
      responseBuffer = ""
      pendingCallbacks = []
      constructor(e) {
        this.addition = e
        let { host: t, port: r } = k0(e.address)
        ;((this.host = t), (this.port = r), (this.encoding = Mr(e.encoding)))
      }
      async connect() {
        if (this.controlSocket && !this.controlSocket.destroyed)
          try {
            await this.sendCommand("NOOP")
            return
          } catch {
            this.close()
          }
        let e = await b0()
        return new Promise((t, r) => {
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
              ;(s && r(o), this.close())
            }),
            n.on("timeout", () => {
              ;(this.close(), r(new Error("[FTP] Control connection timeout")))
            }),
            n.on("close", () => {
              this.close()
            }),
            this.pendingCallbacks.push({
              resolve: async (o) => {
                if (((s = !1), o.code !== 220))
                  return (
                    this.close(),
                    r(new Error(`[FTP] Unexpected banner: ${o.raw}`))
                  )
                try {
                  ;(await this.login(), t())
                } catch (a) {
                  ;(this.close(), r(a))
                }
              },
              reject: (o) => {
                ;((s = !1), this.close(), r(o))
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
        let t = on(e, this.encoding)
        this.responseBuffer += t
        let r = this.responseBuffer.split(`\r
`)
        if (r.length > 1) {
          this.responseBuffer = r.pop() || ""
          for (let s of r) {
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
          new Promise((t, r) => {
            this.pendingCallbacks.push({ resolve: t, reject: r })
            let s = Buffer.concat([
              $o(e, this.encoding),
              Buffer.from(
                `\r
`,
                "ascii",
              ),
            ])
            this.controlSocket.write(s, (n) => {
              if (n) {
                let o = this.pendingCallbacks.findIndex((a) => a.resolve === t)
                ;(o >= 0 && this.pendingCallbacks.splice(o, 1), r(n))
              }
            })
          })
        )
      }
      async openDataConnection() {
        let e = await b0(),
          t = await this.sendCommand("PASV")
        if (t.code !== 227) throw new Error(`[FTP] PASV failed: ${t.raw}`)
        let r = t.message.match(/\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/)
        if (!r) throw new Error(`[FTP] Invalid PASV response: ${t.message}`)
        let s = `${r[1]}.${r[2]}.${r[3]}.${r[4]}`,
          n = parseInt(r[5], 10) * 256 + parseInt(r[6], 10),
          o = s === "0.0.0.0" || s === "127.0.0.1" ? this.host : s
        return {
          dataSocket: e.createConnection({ host: o, port: n }),
          host: o,
          port: n,
        }
      }
      async list(e, t = !1) {
        await this.connect()
        let r = e || "/",
          s = r
        t && r !== "/" && (await this.sendCommand(`CWD ${r}`), (s = ""))
        let { dataSocket: n } = await this.openDataConnection(),
          o = [],
          a = new Promise((g, w) => {
            ;(n.on("data", (m) => o.push(m)),
              n.on("error", w),
              n.on("close", () => g(Buffer.concat(o))))
          }),
          c = s ? `LIST ${s}` : "LIST",
          d = await this.sendCommand(c)
        if (d.code >= 400)
          throw (n.destroy(), new Error(`[FTP] LIST failed: ${d.raw}`))
        let l = await a,
          u = await new Promise((g, w) => {
            this.pendingCallbacks.push({ resolve: g, reject: w })
          })
        if (u.code >= 400 && u.code !== 226 && u.code !== 250)
          throw new Error(`[FTP] LIST completion error: ${u.raw}`)
        let h = on(l, this.encoding).split(/\r?\n/),
          f = []
        for (let g of h) {
          let w = P0(g, this.encoding)
          w && f.push(w)
        }
        return f
      }
      async stat(e) {
        await this.connect()
        let t = e.replace(/\\/g, "/"),
          r = t.slice(0, t.lastIndexOf("/")) || "/",
          s = t.split("/").filter(Boolean).pop() || ""
        if (!s || t === "/")
          return { name: "root", size: 0, is_dir: !0, modified: new Date() }
        let o = (await this.list(r)).find((a) => a.name === s)
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
          r = t.split("/").filter(Boolean),
          s = t.startsWith("/") ? "/" : ""
        for (let n of r) {
          s = s === "/" ? "/" + n : s + "/" + n
          try {
            await this.mkdir(s)
          } catch {}
        }
      }
      async rename(e, t) {
        await this.connect()
        let r = await this.sendCommand(`RNFR ${e}`)
        if (r.code !== 350) throw new Error(`[FTP] RNFR failed: ${r.raw}`)
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
        for (let r of t) {
          let s = `${e.replace(/\/+$/, "")}/${r.name}`
          r.is_dir ? await this.removeRecursive(s) : await this.removeFile(s)
        }
        await this.removeDir(e)
      }
      async upload(e, t) {
        await this.connect()
        let { dataSocket: r } = await this.openDataConnection(),
          s = await this.sendCommand(`STOR ${e}`)
        if (s.code >= 400)
          throw (r.destroy(), new Error(`[FTP] STOR failed: ${s.raw}`))
        await new Promise((o, a) => {
          ;(r.on("error", a), r.end(t, () => o()))
        })
        let n = await new Promise((o, a) => {
          this.pendingCallbacks.push({ resolve: o, reject: a })
        })
        if (n.code >= 400 && n.code !== 226 && n.code !== 250)
          throw new Error(`[FTP] Upload completion error: ${n.raw}`)
      }
      async download(e, t) {
        await this.connect()
        let { PassThrough: r } = await gg()
        if (t && t.start && t.start > 0) {
          let d = await this.sendCommand(`REST ${t.start}`)
          if (d.code !== 350)
            throw new Error(`[FTP] REST offset failed: ${d.raw}`)
        }
        let { dataSocket: s } = await this.openDataConnection(),
          n = await this.sendCommand(`RETR ${e}`)
        if (n.code >= 400)
          throw (s.destroy(), new Error(`[FTP] RETR failed: ${n.raw}`))
        let o = new r(),
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
function Lo(i) {
  let e = { ...(i || {}) }
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
function Me(i) {
  return (
    "/" + (i || "").replace(/\\/g, "/").split("/").filter(Boolean).join("/")
  )
}
function S0(i) {
  let e = Me(i),
    t = e.lastIndexOf("/")
  return t <= 0 ? "/" : e.slice(0, t)
}
function er(...i) {
  let e = i.map((t) => (t || "").replace(/\\/g, "/")).join("/")
  return Me(e)
}
var an,
  A0 = R(() => {
    "use strict"
    ee()
    zo()
    an = class {
      client
      addition
      constructor(e) {
        ;((this.addition = Lo(e)), (this.client = new Hr(this.addition)))
      }
      async init() {
        if (!this.addition.address || !this.addition.username)
          throw new Error("[FTP] address and username are required")
        await this.client.connect()
      }
      async list(e, t) {
        let r = Me(t || this.addition.root_folder_path || "/"),
          s = !!this.addition.cwd_list,
          n = await this.client.list(r, s),
          o = []
        for (let a of n) {
          let c = er(r, a.name),
            d = a.modified
              ? new Date(a.modified).toISOString()
              : new Date().toISOString()
          o.push({
            name: a.name,
            size: a.is_dir ? 0 : a.size,
            is_dir: a.is_dir,
            modified: d,
            sign: c,
            type: z(a.name, a.is_dir),
            raw_url: "",
          })
        }
        return o
      }
      async get(e, t) {
        let r = Me(t || this.addition.root_folder_path || "/")
        if (r === "/" || r === Me(this.addition.root_folder_path || "/"))
          return {
            name: "root",
            size: 0,
            is_dir: !0,
            modified: new Date().toISOString(),
            sign: r,
            type: 1,
            raw_url: "",
          }
        let s = await this.client.stat(r),
          n = r.split("/").filter(Boolean).pop() || "root",
          o = s.modified
            ? new Date(s.modified).toISOString()
            : new Date().toISOString()
        return {
          name: n,
          size: s.is_dir ? 0 : s.size,
          is_dir: s.is_dir,
          modified: o,
          sign: r,
          type: z(n, s.is_dir),
          raw_url: "",
        }
      }
      async mkdir(e, t) {
        let r = Me(t)
        await this.client.mkdirAll(r)
      }
      async rename(e, t, r) {
        let s = Me(t),
          n = er(S0(s), r)
        await this.client.rename(s, n)
      }
      async remove(e, t, r) {
        let s = Me(t)
        if (r && r.length > 0)
          for (let n of r) await this.client.removeRecursive(er(s, n))
        else await this.client.removeRecursive(s)
      }
      async move(e, t, r, s, n) {
        if (r && r.length > 0)
          for (let o of r) {
            let a = er(s, o),
              c = er(n, o)
            await this.client.rename(a, c)
          }
        else {
          let o = s.split("/").filter(Boolean).pop() || "",
            a = er(t, o)
          await this.client.rename(Me(s), a)
        }
      }
      async copy(e, t, r, s, n) {
        throw new Error("[FTP] Copy not supported")
      }
      async put(e, t, r) {
        let s = Me(t)
        ;(await this.client.mkdirAll(S0(s)), await this.client.upload(s, r))
      }
      async createReadStream(e, t) {
        let r = Me(e)
        return this.client.download(r, t)
      }
    }
  })
var C0 = R(() => {
  "use strict"
})
var T0 = {}
St(T0, {
  FTPClient: () => Hr,
  FTPDriver: () => an,
  decodeFtpBuffer: () => on,
  encodeFtpString: () => $o,
  normalizeEncoding: () => Mr,
  normalizeFTPAddition: () => Lo,
  parseFtpAddress: () => k0,
  parseListLine: () => P0,
})
var D0 = R(() => {
  "use strict"
  A0()
  C0()
  qo()
  zo()
})
var at = {}
St(at, {
  copyItems: () => Vo,
  flushPendingDriverState: () => ve,
  getDriver: () => re,
  getItem: () => tr,
  getOrCreateDriver: () => F0,
  listItems: () => ct,
  makeDirectory: () => Ho,
  moveItems: () => Go,
  putItem: () => dn,
  removeItems: () => Ko,
  renameItem: () => Wo,
  scheduleStoragePersistence: () => I0,
})
async function yg() {
  if (!No) {
    let { LocalDriver: i } = await Promise.resolve().then(() => (m0(), f0))
    No = new i()
  }
  return No
}
async function wg(i) {
  if (typeof process < "u" && process.release?.name === "node") {
    let { SFTPDriver: e } = await Promise.resolve().then(() => (v0(), _0)),
      t = new e(J(i))
    return (await t.init?.(), t)
  }
  throw new Error(
    "SFTP storage driver requires Node.js runtime (raw TCP sockets not available in Cloudflare Workers)",
  )
}
async function xg(i) {
  if (typeof process < "u" && process.release?.name === "node") {
    let { FTPDriver: e } = await Promise.resolve().then(() => (D0(), T0)),
      t = new e(J(i))
    return (await t.init?.(), t)
  }
  throw new Error(
    "FTP storage driver requires Node.js runtime (raw TCP sockets not available in Cloudflare Workers)",
  )
}
async function F0(i, e, t) {
  let r = i.get(e)
  if (r) return r
  let s = t()
  i.set(e, s)
  try {
    return await s
  } catch (n) {
    throw (i.get(e) === s && i.delete(e), n)
  }
}
function J(i) {
  let e = i?.addition
  return e ? (typeof e == "string" ? JSON.parse(e || "{}") : e) : {}
}
async function E0(i, e) {
  let t = (i || "").toLowerCase().replace(/[^a-z0-9]/g, "")
  if (t === "local") {
    if (typeof process < "u" && process.release?.name === "node") return yg()
    throw new Error(
      "Local storage driver requires Node.js runtime (not available in Cloudflare Workers)",
    )
  }
  if (t === "sftp") return wg(e)
  if (t === "ftp") return xg(e)
  if (!e)
    throw new Error(
      "failed get driver: storage config not found for driver " + i,
    )
  let r
  if (t === "onedriveapp") {
    r = new bi(J(e))
    try {
      await r.init?.()
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
    r = new vi(J(e), async (s) => {
      try {
        let n = await $(),
          o = (n.storages || []).find((c) => c.id === e?.id)
        if (!o) return
        let a =
          typeof o.addition == "string"
            ? JSON.parse(o.addition || "{}")
            : o.addition || {}
        ;((a.refresh_token = s), (o.addition = JSON.stringify(a)), await j(n))
      } catch (n) {
        console.warn("[Onedrive] failed to persist refresh token:", n)
      }
    })
    try {
      await r.init?.()
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
    ((r = new Pi(J(e))), await r.init?.())
  else if (
    t === "googledrive" ||
    t === "gdrive" ||
    t === "google" ||
    t.startsWith("google")
  )
    ((r = new Ai(J(e))), await r.init?.())
  else if (
    t === "quark" ||
    t === "quarkuc" ||
    t === "uc" ||
    t === "quarkcookie"
  )
    ((r = new Ti(J(e))), await r.init?.())
  else if (
    t === "123pan" ||
    t === "123" ||
    t === "123panshare" ||
    t.startsWith("123")
  ) {
    let s = J(e)
    ;((r = new Ei(s, async (n) => {
      try {
        let o = await $(),
          a = (o.storages || []).find((d) => d.id === e?.id)
        if (!a) return
        let c =
          typeof a.addition == "string"
            ? JSON.parse(a.addition || "{}")
            : a.addition || {}
        ;((c.access_token = n), (a.addition = JSON.stringify(c)), await j(o))
      } catch (o) {
        console.warn("[123Pan] failed to persist access_token:", o)
      }
    })),
      await r.init?.())
  } else if (
    t === "baidunetdisk" ||
    t === "baidu" ||
    t === "baiduyun" ||
    t === "baiduphoto" ||
    t === "baidushare" ||
    t.startsWith("baidu")
  ) {
    let s = J(e)
    ;((r = new Ii(s, async (n) => {
      try {
        let o = await $(),
          a = (o.storages || []).find((d) => d.id === e?.id)
        if (!a) return
        let c =
          typeof a.addition == "string"
            ? JSON.parse(a.addition || "{}")
            : a.addition || {}
        ;((c.access_token = n.access_token),
          (c.refresh_token = n.refresh_token),
          (a.addition = JSON.stringify(Xt(c))),
          await j(o))
      } catch (o) {
        console.warn("[baidu_netdisk] failed to persist token:", o)
      }
    })),
      await r.init?.())
  } else if (
    t === "115open" ||
    t === "115" ||
    t === "115pan" ||
    t === "115cloud" ||
    t.startsWith("115")
  ) {
    let s = J(e)
    ;((r = new Ui(s, async (n) => {
      try {
        let o = await $(),
          a = (o.storages || []).find((d) => d.id === e?.id)
        if (!a) return
        let c =
          typeof a.addition == "string"
            ? JSON.parse(a.addition || "{}")
            : a.addition || {}
        ;((c.access_token = n.access_token),
          (c.refresh_token = n.refresh_token),
          (a.addition = JSON.stringify(c)),
          await j(o))
      } catch (o) {
        console.warn("[115open] failed to persist token:", o)
      }
    })),
      await r.init?.())
  } else if (t === "github" || t === "githubapi" || t === "github_api") {
    let s = J(e)
    ;((r = new qi(s)), await r.init?.())
  } else if (
    t === "thunderexpert" ||
    t === "thunderbrowserexpert" ||
    t === "thunderxexpert" ||
    (t.includes("thunder") && t.includes("expert")) ||
    (t.includes("xunlei") && t.includes("expert"))
  ) {
    let s = J(e)
    ;((r = new ks(s, async (n) => {
      try {
        ;(n.device_id && (s.device_id = n.device_id),
          n.refresh_token && (s.refresh_token = n.refresh_token),
          n.captcha_token && (s.captcha_token = n.captcha_token),
          (e.addition = JSON.stringify(s)))
        let o = await $(),
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
            await j(o))
        }
      } catch (o) {
        console.warn("[thunderexpert] failed to persist token:", o)
      }
    })),
      await r.init?.())
  } else if (
    t === "thunder" ||
    t === "xunlei" ||
    t === "thunderbrowser" ||
    t === "thunderx" ||
    t.includes("thunder") ||
    t.includes("xunlei")
  ) {
    let s = J(e)
    ;((r = new qr(s, async (n) => {
      try {
        ;(n.device_id && (s.device_id = n.device_id),
          n.refresh_token && (s.refresh_token = n.refresh_token),
          n.captcha_token && (s.captcha_token = n.captcha_token),
          (e.addition = JSON.stringify(s)))
        let o = await $(),
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
            await j(o))
        }
      } catch (o) {
        console.warn("[thunder] failed to persist token:", o)
      }
    })),
      await r.init?.())
  } else if (
    t === "lanzou" ||
    t === "lanzoupan" ||
    t === "ilanzou" ||
    t === "lanzoui" ||
    t === "lanzous"
  ) {
    let s = J(e)
    ;((r = new As(s, async (n) => {
      try {
        let o = await $(),
          a = (o.storages || []).find((d) => d.id === e?.id)
        if (!a) return
        let c =
          typeof a.addition == "string"
            ? JSON.parse(a.addition || "{}")
            : a.addition || {}
        ;((c.cookie = n), (a.addition = JSON.stringify(c)), await j(o))
      } catch (o) {
        console.warn("[Lanzou] failed to persist cookie:", o)
      }
    })),
      await r.init?.())
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
    let s = J(e)
    ;((r = new Es(s)), await r.init?.())
  } else if (t === "webdav" || t === "webdavdriver") {
    let s = J(e)
    ;((r = new Is(s)), await r.init?.())
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
    let s = J(e)
    ;((r = new Ls(s, e.driver || "S3")), await r.init?.())
  } else if (
    t === "wopan" ||
    t === "unicom" ||
    t === "unicomcloud" ||
    t === "woyun" ||
    t === "chinaunicom"
  ) {
    let s = J(e)
    ;((r = new qs(s, async (n, o) => {
      try {
        let a = await $(),
          c = (a.storages || []).find((l) => l.id === e?.id)
        if (!c) return
        let d =
          typeof c.addition == "string"
            ? JSON.parse(c.addition || "{}")
            : c.addition || {}
        ;((d.access_token = n),
          (d.refresh_token = o),
          (c.addition = JSON.stringify(Po(d))),
          await j(a))
      } catch (a) {
        console.warn("[WoPan] failed to persist tokens:", a)
      }
    })),
      await r.init?.())
  } else if (
    t === "weiyun" ||
    t === "tencentweiyun" ||
    t === "txweiyun" ||
    t.includes("weiyun")
  ) {
    let s = J(e)
    ;((r = new Ws(s, async (n) => {
      try {
        let o = await $(),
          a = (o.storages || []).find((d) => d.id === e?.id)
        if (!a) return
        let c =
          typeof a.addition == "string"
            ? JSON.parse(a.addition || "{}")
            : a.addition || {}
        ;((c.cookies = n), (a.addition = JSON.stringify(Eo(c))), await j(o))
      } catch (o) {
        console.warn("[WeiYun] failed to persist cookies:", o)
      }
    })),
      await r.init?.())
  } else if (t === "pikpak" || t === "pikpakshare" || t.includes("pikpak")) {
    let s = J(e)
    ;((r = new Gs(s, async (n) => {
      try {
        let o = await $(),
          a = (o.storages || []).find((d) => d.id === e?.id)
        if (!a) return
        let c =
          typeof a.addition == "string"
            ? JSON.parse(a.addition || "{}")
            : a.addition || {}
        ;((c.refresh_token = n.refreshToken),
          n.captchaToken && (c.captcha_token = n.captchaToken),
          (a.addition = JSON.stringify(c)),
          await j(o))
      } catch (o) {
        console.warn("[PikPak] failed to persist tokens:", o)
      }
    })),
      await r.init?.())
  } else if (t === "seafile" || t.includes("seafile")) {
    let s = J(e)
    ;((r = new Js(s, async (n) => {
      try {
        let o = await $(),
          a = (o.storages || []).find((d) => d.id === e?.id)
        if (!a) return
        let c =
          typeof a.addition == "string"
            ? JSON.parse(a.addition || "{}")
            : a.addition || {}
        ;((c.token = n), (a.addition = JSON.stringify(c)), await j(o))
      } catch (o) {
        console.warn("[Seafile] failed to persist token:", o)
      }
    })),
      await r.init?.())
  } else if (
    t === "yandex" ||
    t === "yandexdisk" ||
    t === "yandexdrive" ||
    t.includes("yandex")
  ) {
    let s = J(e)
    ;((r = new Xs(s, async (n) => {
      try {
        let o = await $(),
          a = (o.storages || []).find((d) => d.id === e?.id)
        if (!a) return
        let c =
          typeof a.addition == "string"
            ? JSON.parse(a.addition || "{}")
            : a.addition || {}
        ;((c.refresh_token = n.refreshToken),
          (a.addition = JSON.stringify(c)),
          await j(o))
      } catch (o) {
        console.warn("[Yandex] failed to persist token:", o)
      }
    })),
      await r.init?.())
  } else if (t === "terabox" || t === "dubox" || t.includes("terabox")) {
    let s = J(e)
    ;((r = new Zs(s)), await r.init?.())
  } else if (
    t === "mediatrack" ||
    t === "fenmiao" ||
    t.includes("mediatrack")
  ) {
    let s = J(e)
    ;((r = new tn(s)), await r.init?.())
  } else if (t === "alias" || t.includes("alias")) {
    let s = J(e)
    ;((r = new rn(s)), await r.init?.())
  } else throw new Error("failed get driver: unsupported driver '" + i + "'")
  return r
}
async function re(i, e) {
  if ((i || "").toLowerCase().replace(/[^a-z0-9]/g, "") === "local")
    return E0(i, e)
  if (!e)
    throw new Error(
      "failed get driver: storage config not found for driver " + i,
    )
  let r = `${e.id}_${e.modified}`,
    s = Mo.get(r)
  return (
    s ||
    F0(_g, r, async () => {
      let n = Mo.get(r)
      if (n) return n
      let o = await E0(i, e)
      return (Mo.set(r, o), o)
    })
  )
}
function vg(i) {
  let e = (i || "").toLowerCase().replace(/[^a-z0-9]/g, "")
  return (
    e === "189" ||
    e === "189cloud" ||
    e === "cloud189" ||
    e === "ctyun" ||
    e === "189pan"
  )
}
async function I0(i, e) {
  if (i)
    try {
      i(e)
      return
    } catch {}
  await e
}
async function bg(i, e) {
  let t = String(i?.id || "")
  if (!t) return
  let s = (cn.get(t) || Promise.resolve())
    .catch(() => {})
    .then(async () => {
      let n = await $(),
        o = (n.storages || []).find((c) => String(c.id) === t)
      if (!o) return
      let a =
        typeof o.addition == "string"
          ? JSON.parse(o.addition || "{}")
          : o.addition || {}
      ;(a.cookies !== void 0 || R0(i?.driver)
        ? (a.cookies = e)
        : (a.cookie = e),
        (o.addition = JSON.stringify(a)),
        String(i?.id) === t && (i.addition = o.addition),
        await j(n))
    })
  cn.set(t, s)
  try {
    await s
  } finally {
    cn.get(t) === s && cn.delete(t)
  }
}
function R0(i) {
  let e = (i || "").toLowerCase().replace(/[^a-z0-9]/g, "")
  return (
    e === "weiyun" ||
    e === "tencentweiyun" ||
    e === "txweiyun" ||
    e.includes("weiyun")
  )
}
async function ve(i, e, t, r) {
  if (!vg(i) && !R0(i)) return
  let n = t.consumePendingCookie?.call(t)
  if (!n) return
  let o = bg(e, n).catch((a) => {
    console.warn(`[${i}] failed to persist cookie:`, a)
  })
  await I0(r?.waitUntil, o)
}
async function ct(i, e) {
  let t = await de(i),
    r = [],
    s = "Virtual"
  if (t.storage) {
    s = t.storage.driver
    try {
      let c = await re(s, t.storage)
      try {
        r = await c.list(i, t.physical)
      } finally {
        await ve(s, t.storage, c, e)
      }
      if (t.storage.status !== "work") {
        t.storage.status = "work"
        let d = await $(),
          l = (d.storages || []).find((u) => u.id === t.storage?.id)
        l && ((l.status = "work"), await j(d))
      }
    } catch (c) {
      try {
        let d = await $(),
          l = (d.storages || []).find((u) => u.id === t.storage?.id)
        l && ((l.status = c.message || String(c)), await j(d))
      } catch (d) {
        console.warn("Failed to persist storage status:", d)
      }
      throw c
    }
  } else if (!t.isVirtual)
    throw new Error("failed get storage: storage not found")
  let o = ((await $()).storages || []).filter((c) => !c.disabled),
    a = t.cleanPath
  return (
    o.forEach((c) => {
      let d = "/" + (c.mount_path || "").split("/").filter(Boolean).join("/")
      if (d === a || d === "/") return
      let l = a === "/" ? "/" : a + "/"
      if (d.startsWith(l)) {
        let u = d.slice(l.length).split("/").filter(Boolean)[0]
        u &&
          !r.some((p) => p.name === u) &&
          r.push({
            name: u,
            size: 0,
            is_dir: !0,
            modified: c.modified || new Date().toISOString(),
            sign: "",
            type: 1,
          })
      }
    }),
    r.forEach((c) => {
      c.type || (c.type = z(c.name, c.is_dir))
    }),
    { content: r, provider: s, storage: t.storage }
  )
}
async function tr(i, e) {
  let t = await de(i)
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
      a = J(t.storage)
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
      rawUrl: `/api/p${i.startsWith("/") ? "" : "/"}${i}`,
    }
  }
  let r = t.storage ? t.storage.driver : "Local",
    s = await re(r, t.storage),
    n
  try {
    n = await s.get(i, t.physical)
  } finally {
    await ve(r, t.storage, s, e)
  }
  return (
    n.type || (n.type = z(n.name, n.is_dir)),
    {
      item: n,
      provider: r,
      rawUrl: `/api/p${i.startsWith("/") ? "" : "/"}${i}`,
    }
  )
}
async function Ho(i, e) {
  let t = await de(i)
  if (t.isVirtual) throw new Error("failed get storage: storage not found")
  let r = await re(t.storage.driver, t.storage)
  try {
    await r.mkdir(i, t.physical)
  } finally {
    await ve(t.storage.driver, t.storage, r, e)
  }
}
async function Wo(i, e, t) {
  let r = await de(i)
  if (r.isVirtual) throw new Error("failed get storage: storage not found")
  let s = await re(r.storage.driver, r.storage)
  try {
    await s.rename(i, r.physical, e)
  } finally {
    await ve(r.storage.driver, r.storage, s, t)
  }
}
async function Ko(i, e, t) {
  for (let r of e) {
    let s = `${i}/${r}`,
      n = await de(s)
    if (n.isVirtual) throw new Error("failed get storage: storage not found")
    let o = await re(n.storage.driver, n.storage)
    try {
      await o.remove(s, n.physical, [r])
    } finally {
      await ve(n.storage.driver, n.storage, o, t)
    }
  }
}
async function Go(i, e, t, r) {
  for (let s of t) {
    let n = `${i}/${s}`,
      o = `${e}/${s}`,
      a = await de(n),
      c = await de(o)
    if (a.isVirtual || c.isVirtual)
      throw new Error("failed get storage: storage not found")
    let d = await re(a.storage.driver, a.storage)
    try {
      await d.move(i, e, [s], a.physical, c.physical)
    } finally {
      await ve(a.storage.driver, a.storage, d, r)
    }
  }
}
async function Vo(i, e, t, r) {
  for (let s of t) {
    let n = `${i}/${s}`,
      o = `${e}/${s}`,
      a = await de(n),
      c = await de(o)
    if (a.isVirtual || c.isVirtual)
      throw new Error("failed get storage: storage not found")
    let d = await re(a.storage.driver, a.storage)
    try {
      await d.copy(i, e, [s], a.physical, c.physical)
    } finally {
      await ve(a.storage.driver, a.storage, d, r)
    }
  }
}
async function dn(i, e, t) {
  let r = await de(i)
  if (r.isVirtual) throw new Error("failed get storage: storage not found")
  let s = await re(r.storage.driver, r.storage)
  try {
    await s.put(i, r.physical, e)
  } finally {
    await ve(r.storage.driver, r.storage, s, t)
  }
}
var No,
  Mo,
  _g,
  cn,
  Pe = R(() => {
    "use strict"
    ne()
    ee()
    Mc()
    Xc()
    ed()
    od()
    ud()
    yd()
    Pd()
    Td()
    Fd()
    Jl()
    tu()
    hu()
    yu()
    Ou()
    Ku()
    t0()
    s0()
    o0()
    c0()
    l0()
    p0()
    h0()
    No = null
    ;((Mo = new Map()), (_g = new Map()), (cn = new Map()))
  })
var U0,
  kg,
  Pg,
  Sg,
  Ag,
  B0,
  ln,
  Jo,
  $0 = R(() => {
    At()
    ;((U0 = { name: "HMAC", hash: "SHA-256" }),
      (kg = async (i) => {
        let e = typeof i == "string" ? new TextEncoder().encode(i) : i
        return await crypto.subtle.importKey("raw", e, U0, !1, [
          "sign",
          "verify",
        ])
      }),
      (Pg = async (i, e, t) => {
        try {
          let r = atob(i),
            s = new Uint8Array(r.length)
          for (let n = 0, o = r.length; n < o; n++) s[n] = r.charCodeAt(n)
          return await crypto.subtle.verify(
            U0,
            t,
            s,
            new TextEncoder().encode(e),
          )
        } catch {
          return !1
        }
      }),
      (Sg = /^[!#-:<>-[\]-~]+$/),
      (Ag = /^[ !#-:<-[\]-~]*$/),
      (B0 = (i) => {
        let e = 0,
          t = i.length
        for (; e < t; ) {
          let r = i.charCodeAt(e)
          if (r !== 32 && r !== 9) break
          e++
        }
        for (; t > e; ) {
          let r = i.charCodeAt(t - 1)
          if (r !== 32 && r !== 9) break
          t--
        }
        return e === 0 && t === i.length ? i : i.slice(e, t)
      }),
      (ln = (i, e) => {
        if (e && i.indexOf(e) === -1) return {}
        let t = i.split(";"),
          r = Object.create(null)
        for (let s of t) {
          let n = s.indexOf("=")
          if (n === -1) continue
          let o = B0(s.substring(0, n))
          if ((e && e !== o) || !Sg.test(o) || o in r) continue
          let a = B0(s.substring(n + 1))
          if (
            (a.startsWith('"') && a.endsWith('"') && (a = a.slice(1, -1)),
            Ag.test(a) && ((r[o] = Kt(a)), e))
          )
            break
        }
        return r
      }),
      (Jo = async (i, e, t) => {
        let r = Object.create(null),
          s = await kg(e)
        for (let [n, o] of Object.entries(ln(i, t))) {
          let a = o.lastIndexOf(".")
          if (a < 1) continue
          let c = o.substring(0, a),
            d = o.substring(a + 1)
          if (d.length !== 44 || !d.endsWith("=")) continue
          let l = await Pg(d, c, s)
          r[n] = l ? c : !1
        }
        return r
      }))
  })
var un,
  Qo,
  q0 = R(() => {
    $0()
    ;((un = (i, e, t) => {
      let r = i.req.raw.headers.get("Cookie")
      if (typeof e == "string") {
        if (!r) return
        let n = e
        return (
          t === "secure"
            ? (n = "__Secure-" + e)
            : t === "host" && (n = "__Host-" + e),
          ln(r, n)[n]
        )
      }
      return r ? ln(r) : {}
    }),
      (Qo = async (i, e, t, r) => {
        let s = i.req.raw.headers.get("Cookie")
        if (typeof t == "string") {
          if (!s) return
          let o = t
          return (
            r === "secure"
              ? (o = "__Secure-" + t)
              : r === "host" && (o = "__Host-" + t),
            (await Jo(s, e, o))[o]
          )
        }
        return s ? await Jo(s, e) : {}
      }))
  })
var Xo,
  Yo,
  Cg,
  Zo,
  ea = R(() => {
    ;((Xo = (i) =>
      Zo(i.replace(/_|-/g, (e) => ({ _: "/", "-": "+" })[e] ?? e))),
      (Yo = (i) =>
        Cg(i).replace(/\/|\+/g, (e) => ({ "/": "_", "+": "-" })[e] ?? e)),
      (Cg = (i) => {
        let e = "",
          t = new Uint8Array(i)
        for (let r = 0, s = t.length; r < s; r++) e += String.fromCharCode(t[r])
        return btoa(e)
      }),
      (Zo = (i) => {
        let e = atob(i),
          t = new Uint8Array(new ArrayBuffer(e.length)),
          r = e.length / 2
        for (let s = 0, n = e.length - 1; s <= r; s++, n--)
          ((t[s] = e.charCodeAt(s)), (t[n] = e.charCodeAt(n)))
        return t
      }))
  })
var kt,
  ta = R(() => {
    kt = ((i) => (
      (i.HS256 = "HS256"),
      (i.HS384 = "HS384"),
      (i.HS512 = "HS512"),
      (i.RS256 = "RS256"),
      (i.RS384 = "RS384"),
      (i.RS512 = "RS512"),
      (i.PS256 = "PS256"),
      (i.PS384 = "PS384"),
      (i.PS512 = "PS512"),
      (i.ES256 = "ES256"),
      (i.ES384 = "ES384"),
      (i.ES512 = "ES512"),
      (i.EdDSA = "EdDSA"),
      i
    ))(kt || {})
  })
var Tg,
  O0,
  Dg,
  j0 = R(() => {
    ;((Tg = {
      deno: "Deno",
      bun: "Bun",
      workerd: "Cloudflare-Workers",
      node: "Node.js",
    }),
      (O0 = () => {
        let i = globalThis
        if (typeof navigator < "u" && typeof navigator.userAgent == "string") {
          for (let [t, r] of Object.entries(Tg)) if (Dg(r)) return t
        }
        return typeof i?.EdgeRuntime == "string"
          ? "edge-light"
          : i?.fastly !== void 0
            ? "fastly"
            : i?.process?.release?.name === "node"
              ? "node"
              : "other"
      }),
      (Dg = (i) => navigator.userAgent.startsWith(i)))
  })
var z0,
  ra,
  ia,
  Ut,
  L0,
  N0,
  M0,
  pn,
  sa,
  H0,
  W0,
  K0,
  G0,
  V0,
  J0,
  ir,
  na = R(() => {
    ;((z0 = class extends Error {
      constructor(i) {
        ;(super(`${i} is not an implemented algorithm`),
          (this.name = "JwtAlgorithmNotImplemented"))
      }
    }),
      (ra = class extends Error {
        constructor() {
          ;(super('JWT verification requires "alg" option to be specified'),
            (this.name = "JwtAlgorithmRequired"))
        }
      }),
      (ia = class extends Error {
        constructor(i, e) {
          ;(super(`JWT algorithm mismatch: expected "${i}", got "${e}"`),
            (this.name = "JwtAlgorithmMismatch"))
        }
      }),
      (Ut = class extends Error {
        constructor(i) {
          ;(super(`invalid JWT token: ${i}`), (this.name = "JwtTokenInvalid"))
        }
      }),
      (L0 = class extends Error {
        constructor(i) {
          ;(super(`token (${i}) is being used before it's valid`),
            (this.name = "JwtTokenNotBefore"))
        }
      }),
      (N0 = class extends Error {
        constructor(i) {
          ;(super(`token (${i}) expired`), (this.name = "JwtTokenExpired"))
        }
      }),
      (M0 = class extends Error {
        constructor(i, e) {
          ;(super(
            `Invalid "iat" claim, must be a valid number lower than "${i}" (iat: "${e}")`,
          ),
            (this.name = "JwtTokenIssuedAt"))
        }
      }),
      (pn = class extends Error {
        constructor(i, e) {
          ;(super(`expected issuer "${i}", got ${e ? `"${e}"` : "none"} `),
            (this.name = "JwtTokenIssuer"))
        }
      }),
      (sa = class extends Error {
        constructor(i) {
          ;(super(`jwt header is invalid: ${JSON.stringify(i)}`),
            (this.name = "JwtHeaderInvalid"))
        }
      }),
      (H0 = class extends Error {
        constructor(i) {
          ;(super(`required "kid" in jwt header: ${JSON.stringify(i)}`),
            (this.name = "JwtHeaderRequiresKid"))
        }
      }),
      (W0 = class extends Error {
        constructor(i) {
          ;(super(
            `symmetric algorithm "${i}" is not allowed for JWK verification`,
          ),
            (this.name = "JwtSymmetricAlgorithmNotAllowed"))
        }
      }),
      (K0 = class extends Error {
        constructor(i, e) {
          ;(super(
            `algorithm "${i}" is not in the allowed list: [${e.join(", ")}]`,
          ),
            (this.name = "JwtAlgorithmNotAllowed"))
        }
      }),
      (G0 = class extends Error {
        constructor(i) {
          ;(super(`token(${i}) signature mismatched`),
            (this.name = "JwtTokenSignatureMismatched"))
        }
      }),
      (V0 = class extends Error {
        constructor(i) {
          ;(super(`required "aud" in jwt payload: ${JSON.stringify(i)}`),
            (this.name = "JwtPayloadRequiresAud"))
        }
      }),
      (J0 = class extends Error {
        constructor(i, e) {
          ;(super(
            `expected audience "${Array.isArray(i) ? i.join(", ") : i}", got "${e}"`,
          ),
            (this.name = "JwtTokenAudience"))
        }
      }),
      (ir = ((i) => (
        (i.Encrypt = "encrypt"),
        (i.Decrypt = "decrypt"),
        (i.Sign = "sign"),
        (i.Verify = "verify"),
        (i.DeriveKey = "deriveKey"),
        (i.DeriveBits = "deriveBits"),
        (i.WrapKey = "wrapKey"),
        (i.UnwrapKey = "unwrapKey"),
        i
      ))(ir || {})))
  })
var $t,
  Q0,
  oa = R(() => {
    ;(($t = new TextEncoder()), (Q0 = new TextDecoder()))
  })
async function Y0(i, e, t) {
  let r = ep(e),
    s = await Eg(i, r)
  return await crypto.subtle.sign(r, s, t)
}
async function Z0(i, e, t, r) {
  let s = ep(e),
    n = await Fg(i, s)
  return await crypto.subtle.verify(s, n, t, r)
}
function aa(i) {
  return Zo(i.replace(/-+(BEGIN|END).*?-+/g, "").replace(/\s/g, ""))
}
async function Eg(i, e) {
  if (!crypto.subtle || !crypto.subtle.importKey)
    throw new Error(
      "`crypto.subtle.importKey` is undefined. JWT auth middleware requires it.",
    )
  if (tp(i)) {
    if (i.type !== "private" && i.type !== "secret")
      throw new Error(
        `unexpected key type: CryptoKey.type is ${i.type}, expected private or secret`,
      )
    return i
  }
  let t = [ir.Sign]
  return typeof i == "object"
    ? await crypto.subtle.importKey("jwk", i, e, !1, t)
    : i.includes("PRIVATE")
      ? await crypto.subtle.importKey("pkcs8", aa(i), e, !1, t)
      : await crypto.subtle.importKey("raw", $t.encode(i), e, !1, t)
}
async function Fg(i, e) {
  if (!crypto.subtle || !crypto.subtle.importKey)
    throw new Error(
      "`crypto.subtle.importKey` is undefined. JWT auth middleware requires it.",
    )
  if (tp(i)) {
    if (i.type === "public" || i.type === "secret") return i
    i = await X0(i)
  }
  if (typeof i == "string" && i.includes("PRIVATE")) {
    let r = await crypto.subtle.importKey("pkcs8", aa(i), e, !0, [ir.Sign])
    i = await X0(r)
  }
  let t = [ir.Verify]
  return typeof i == "object"
    ? await crypto.subtle.importKey("jwk", i, e, !1, t)
    : i.includes("PUBLIC")
      ? await crypto.subtle.importKey("spki", aa(i), e, !1, t)
      : await crypto.subtle.importKey("raw", $t.encode(i), e, !1, t)
}
async function X0(i) {
  if (i.type !== "private") throw new Error(`unexpected key type: ${i.type}`)
  if (!i.extractable) throw new Error("unexpected private key is unextractable")
  let e = await crypto.subtle.exportKey("jwk", i),
    { kty: t } = e,
    { alg: r, e: s, n } = e,
    { crv: o, x: a, y: c } = e
  return { kty: t, alg: r, e: s, n, crv: o, x: a, y: c, key_ops: [ir.Verify] }
}
function ep(i) {
  switch (i) {
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
      throw new z0(i)
  }
}
function tp(i) {
  return O0() === "node" && crypto.webcrypto
    ? i instanceof crypto.webcrypto.CryptoKey
    : i instanceof CryptoKey
}
var rp = R(() => {
  j0()
  ea()
  na()
  oa()
})
function ip(i) {
  if (typeof i == "object" && i !== null) {
    let e = i
    return (
      "alg" in e &&
      Object.values(kt).includes(e.alg) &&
      (!("typ" in e) || e.typ === "JWT")
    )
  }
  return !1
}
var ca,
  Ig,
  da,
  sp,
  la,
  Rg,
  np,
  ua,
  Bg,
  op = R(() => {
    ea()
    ta()
    rp()
    na()
    oa()
    ;((ca = (i) => Yo($t.encode(JSON.stringify(i)).buffer).replace(/=/g, "")),
      (Ig = (i) => Yo(i).replace(/=/g, "")),
      (da = (i) => JSON.parse(Q0.decode(Xo(i)))))
    ;((sp = async (i, e, t = "HS256") => {
      let r = ca(i),
        s
      typeof e == "object" && "alg" in e
        ? ((t = e.alg), (s = ca({ alg: t, typ: "JWT", kid: e.kid })))
        : (s = ca({ alg: t, typ: "JWT" }))
      let n = `${s}.${r}`,
        o = await Y0(e, t, $t.encode(n)),
        a = Ig(o)
      return `${n}.${a}`
    }),
      (la = async (i, e, t) => {
        if (!t) throw new ra()
        let {
          alg: r,
          iss: s,
          nbf: n = !0,
          exp: o = !0,
          iat: a = !0,
          aud: c,
        } = typeof t == "string" ? { alg: t } : t
        if (!r) throw new ra()
        let d = i.split(".")
        if (d.length !== 3) throw new Ut(i)
        let { header: l, payload: u } = ua(i)
        if (!ip(l)) throw new sa(l)
        if (l.alg !== r) throw new ia(r, l.alg)
        let p = Math.floor(Date.now() / 1e3)
        if (
          n &&
          u.nbf !== void 0 &&
          (typeof u.nbf != "number" || !Number.isFinite(u.nbf) || u.nbf > p)
        )
          throw new L0(i)
        if (
          o &&
          u.exp !== void 0 &&
          (typeof u.exp != "number" || !Number.isFinite(u.exp) || u.exp <= p)
        )
          throw new N0(i)
        if (
          a &&
          u.iat !== void 0 &&
          (typeof u.iat != "number" || !Number.isFinite(u.iat) || p < u.iat)
        )
          throw new M0(p, u.iat)
        if (s) {
          if (!u.iss) throw new pn(s, null)
          if (typeof s == "string" && u.iss !== s) throw new pn(s, u.iss)
          if (s instanceof RegExp && !s.test(u.iss)) throw new pn(s, u.iss)
        }
        if (c) {
          if (!u.aud) throw new V0(u)
          if (
            !(Array.isArray(u.aud) ? u.aud : [u.aud]).some((m) =>
              c instanceof RegExp
                ? c.test(m)
                : typeof c == "string"
                  ? m === c
                  : Array.isArray(c) && c.includes(m),
            )
          )
            throw new J0(c, u.aud)
        }
        let h = i.substring(0, i.lastIndexOf("."))
        if (!(await Z0(e, r, Xo(d[2]), $t.encode(h)))) throw new G0(i)
        return u
      }),
      (Rg = [kt.HS256, kt.HS384, kt.HS512]),
      (np = async (i, e, t) => {
        let r = e.verification || {},
          s = Bg(i)
        if (!ip(s)) throw new sa(s)
        if (!s.kid) throw new H0(s)
        if (Rg.includes(s.alg)) throw new W0(s.alg)
        if (!e.allowedAlgorithms.includes(s.alg))
          throw new K0(s.alg, e.allowedAlgorithms)
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
        if (!o) throw new Ut(i)
        if (o.alg && o.alg !== s.alg) throw new ia(o.alg, s.alg)
        return await la(i, o, { alg: s.alg, ...r })
      }),
      (ua = (i) => {
        let e = i.split(".")
        if (e.length !== 3) throw new Ut(i)
        try {
          let t = da(e[0]),
            r = da(e[1])
          return { header: t, payload: r }
        } catch {
          throw new Ut(i)
        }
      }),
      (Bg = (i) => {
        let e = i.split(".")
        if (e.length !== 3) throw new Ut(i)
        try {
          return da(e[0])
        } catch {
          throw new Ut(i)
        }
      }))
  })
var sr,
  ap = R(() => {
    op()
    sr = { sign: sp, verify: la, decode: ua, verifyWithJwks: np }
  })
function pa(i) {
  let e = (i.realm ?? i.ctx.req.url).replace(/"/g, '\\"'),
    t = i.errDescription.replace(/"/g, '\\"')
  return new Response("Unauthorized", {
    status: 401,
    statusText: i.statusText,
    headers: {
      "WWW-Authenticate": `Bearer realm="${e}",error="${i.error}",error_description="${t}"`,
    },
  })
}
var cp,
  dp,
  Pt,
  lp,
  Kr,
  up = R(() => {
    q0()
    kn()
    ap()
    oi()
    cp = (i) => {
      let e = i.verification || {}
      if (!i || !i.secret)
        throw new Error('JWT auth middleware requires options for "secret"')
      if (!i.alg)
        throw new Error('JWT auth middleware requires options for "alg"')
      if (!crypto.subtle || !crypto.subtle.importKey)
        throw new Error(
          "`crypto.subtle.importKey` is undefined. JWT auth middleware requires it.",
        )
      return async function (r, s) {
        let n = i.headerName || "Authorization",
          o = r.req.raw.headers.get(n),
          a
        if (o) {
          let l = o.split(/\s+/)
          if (l.length !== 2 || l[0].toLowerCase() !== "bearer") {
            let u = "invalid credentials structure"
            throw new wr(401, {
              message: u,
              res: pa({
                ctx: r,
                error: "invalid_request",
                errDescription: u,
                realm: i.realm,
              }),
            })
          } else a = l[1]
        } else
          i.cookie &&
            (typeof i.cookie == "string"
              ? (a = un(r, i.cookie))
              : i.cookie.secret
                ? i.cookie.prefixOptions
                  ? (a = await Qo(
                      r,
                      i.cookie.secret,
                      i.cookie.key,
                      i.cookie.prefixOptions,
                    ))
                  : (a = await Qo(r, i.cookie.secret, i.cookie.key))
                : i.cookie.prefixOptions
                  ? (a = un(r, i.cookie.key, i.cookie.prefixOptions))
                  : (a = un(r, i.cookie.key)))
        if (!a) {
          let l = "no authorization included in request"
          throw new wr(401, {
            message: l,
            res: pa({
              ctx: r,
              error: "invalid_request",
              errDescription: l,
              realm: i.realm,
            }),
          })
        }
        let c, d
        try {
          c = await sr.verify(a, i.secret, { alg: i.alg, ...e })
        } catch (l) {
          d = l
        }
        if (!c)
          throw new wr(401, {
            message: "Unauthorized",
            res: pa({
              ctx: r,
              error: "invalid_token",
              statusText: "Unauthorized",
              errDescription: "token verification failure",
              realm: i.realm,
            }),
            cause: d,
          })
        ;(r.set("jwtPayload", c), await s())
      }
    }
    ;((dp = sr.verifyWithJwks),
      (Pt = sr.verify),
      (lp = sr.decode),
      (Kr = sr.sign))
  })
var pp = {}
St(pp, {
  AlgorithmTypes: () => kt,
  decode: () => lp,
  jwt: () => cp,
  sign: () => Kr,
  verify: () => Pt,
  verifyWithJwks: () => dp,
})
var Gr = R(() => {
  up()
  ta()
})
var hp = R(() => {
  "use strict"
})
function ae(i, e = "Internal server error") {
  if (!i) return e
  let t = typeof i == "string" ? i : i?.message || String(i)
  if (!t) return e
  let r = String(t)
  return r.length > 200 ||
    (/[A-Za-z]:[\\/][^\\/\s]|[\\/][A-Za-z0-9_.-]+[\\/][A-Za-z0-9_.-]/.test(r) &&
      /\.(ts|js|mjs|cjs|json|toml|yml|yaml)/i.test(r)) ||
    /at .*\(|at [A-Za-z0-9_.-]+:[0-9]+:[0-9]+/.test(r)
    ? e
    : r
}
var qt,
  yk,
  Vr = R(() => {
    "use strict"
    ;((qt = class extends Error {
      constructor(t, r, s) {
        super(r)
        this.code = t
        this.message = r
        this.originalError = s
        this.name = "OpenListNextNextError"
      }
      code
      message
      originalError
    }),
      (yk = {
        PathNotFound: new qt(1004, "Path not found"),
        NotReady: new qt(1003, "Storage not ready"),
        InvalidConfig: new qt(1001, "Invalid configuration"),
        Unauthorized: new qt(401, "Unauthorized access"),
        Forbidden: new qt(403, "Permission denied"),
      }))
  })
var fp = R(() => {
  "use strict"
})
var mp = R(() => {
  "use strict"
})
var gp = R(() => {
  "use strict"
})
async function Ot(i) {
  let e = i.req.header("Authorization")
  if (!e) return !1
  let t = e.startsWith("Bearer ") ? e.substring(7) : e,
    r = await $(i.env),
    s = r.settings.find((n) => n.key === "token")
  if (s && s.value && t === s.value) return !0
  try {
    let { verify: n } = await Promise.resolve().then(() => (Gr(), pp)),
      { getJwtSecret: o } = await Promise.resolve().then(() => (Qe(), yp)),
      a = await o(i),
      c = await n(t, a, "HS256")
    if (c && c.role === 2) {
      let d = (r.users || []).find(
        (l) => l.id === c.id || l.username === c.username,
      )
      return !!(d && !d.disabled)
    }
  } catch {}
  return !1
}
var hn = R(() => {
  "use strict"
  ne()
  hp()
  Vr()
  fp()
  mp()
  yt()
  gp()
})
var yp = {}
St(yp, {
  adminAuthMiddleware: () => Se,
  getJwtSecret: () => He,
  getUserFromContext: () => te,
})
function Ug() {
  let i = new Uint8Array(32)
  return (
    crypto.getRandomValues(i),
    Array.from(i, (e) => e.toString(16).padStart(2, "0")).join("")
  )
}
async function $g(i) {
  try {
    let { getKvBinding: e } = await Promise.resolve().then(() => (ne(), Wn)),
      t = await e(i)
    if (t.mode === "none" || !t.binding) return null
    let { binding: r, mode: s } = t,
      n = null
    if (s === "blob") n = await r.get(jt)
    else
      try {
        n = await r.get(jt, "text")
      } catch {
        n = await r.get(jt)
      }
    return (
      n && typeof n.text == "function" && (n = await n.text()),
      n ? String(n) : null
    )
  } catch (e) {
    return (console.warn("[JWT] Failed to read secret from KV:", e), null)
  }
}
async function qg(i, e) {
  try {
    let { getKvBinding: t } = await Promise.resolve().then(() => (ne(), Wn)),
      r = await t(i)
    if (r.mode === "none" || !r.binding) return
    let { binding: s, mode: n } = r
    n === "blob"
      ? typeof s.set == "function"
        ? await s.set(jt, e)
        : typeof s.put == "function" && (await s.put(jt, e))
      : typeof s.put == "function"
        ? await s.put(jt, e)
        : typeof s.set == "function" && (await s.set(jt, e))
  } catch (t) {
    console.warn("[JWT] Failed to persist secret to KV:", t)
  }
}
async function He(i) {
  let e = i?.env || (typeof process < "u" ? process.env : {}) || {},
    t = e.JWT_SECRET
  if (t && t.length >= 16) return t
  let r = await $g(e)
  return r && r.length >= 16 ? r : (fn || ((fn = Ug()), await qg(e, fn)), fn)
}
async function Se(i, e) {
  if (!(await Ot(i)))
    return i.json(
      {
        code: 401,
        message: "Unauthorized admin privilege required",
        data: null,
      },
      401,
    )
  await e()
}
async function te(i) {
  if (await Ot(i))
    return {
      role: 2,
      permission: 0,
      disabled: !1,
      username: "api-token",
      base_path: "/",
    }
  let e = i.req.header("Authorization")
  if (!e) {
    let r = i.req.query("token") || i.req.query("access_token")
    r && (e = `Bearer ${r}`)
  }
  if (!e) {
    try {
      let s = ((await $(i.env)).users || []).find((n) => n.username === "guest")
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
    let r = await He(i),
      s = await Pt(t, r, "HS256"),
      o = ((await $(i.env)).users || []).find(
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
var fn,
  jt,
  Qe = R(() => {
    "use strict"
    Gr()
    hn()
    ne()
    ;((fn = null), (jt = "openlistnext_jwt_secret"))
  })
var bn = (i, e, t) => (r, s) => {
  let n = -1
  return o(0)
  async function o(a) {
    if (a <= n) throw new Error("next() called multiple times")
    n = a
    let c,
      d = !1,
      l
    if (
      (i[a]
        ? ((l = i[a][0][0]), (r.req.routeIndex = a))
        : (l = (a === i.length && s) || void 0),
      l)
    )
      try {
        c = await l(r, () => o(a + 1))
      } catch (u) {
        if (u instanceof Error && e)
          ((r.error = u), (c = await e(u, r)), (d = !0))
        else throw u
      }
    else r.finalized === !1 && t && (c = await t(r))
    return (c && (r.finalized === !1 || d) && (r.res = c), r)
  }
}
oi()
var ce = "ALL",
  tc = "all",
  rc = ["get", "post", "put", "delete", "options", "patch", "query"],
  ai = "Can not add a route since the matcher is already built.",
  ci = class extends Error {}
var ic = "__COMPOSED_HANDLER"
At()
var gh = (i) => i.text("404 Not Found", 404),
  sc = (i, e) => {
    if ("getResponse" in i) {
      let t = i.getResponse()
      return e.newResponse(t.body, t)
    }
    return (console.error(i), e.text("Internal Server Error", 500))
  },
  nc = class oc {
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
      ;([...rc, tc].forEach((n) => {
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
            this.#n(ce, this.#t, a)
          }),
          this
        )))
      let { strict: r, ...s } = e
      ;(Object.assign(this, s),
        (this.getPath = (r ?? !0) ? (e.getPath ?? An) : Ga))
    }
    #e() {
      let e = new oc({ router: this.router, getPath: this.getPath })
      return (
        (e.errorHandler = this.errorHandler),
        (e.#r = this.#r),
        (e.routes = this.routes),
        e
      )
    }
    #r = gh
    errorHandler = sc
    route(e, t) {
      let r = this.basePath(e)
      return (
        t.routes.map((s) => {
          let n
          ;(t.errorHandler === sc
            ? (n = s.handler)
            : ((n = async (o, a) =>
                (await bn([], t.errorHandler)(o, () => s.handler(o, a))).res),
              (n[ic] = s.handler)),
            r.#n(s.method, s.path, n, s.basePath))
        }),
        this
      )
    }
    basePath(e) {
      let t = this.#e()
      return ((t._basePath = pt(this._basePath, e)), t)
    }
    onError = (e) => ((this.errorHandler = e), this)
    notFound = (e) => ((this.#r = e), this)
    mount(e, t, r) {
      let s, n
      r &&
        (typeof r == "function"
          ? (n = r)
          : ((n = r.optionHandler),
            r.replaceRequest === !1 ? (s = (c) => c) : (s = r.replaceRequest)))
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
        let c = pt(this._basePath, e),
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
      return (this.#n(ce, pt(e, "*"), a), this)
    }
    #n(e, t, r, s) {
      ;((e = e.toUpperCase()), (t = pt(this._basePath, t)))
      let n = {
        basePath: s !== void 0 ? pt(this._basePath, s) : this._basePath,
        path: t,
        method: e,
        handler: r,
      }
      ;(this.router.add(e, t, [r, n]), this.routes.push(n))
    }
    #i(e, t) {
      if (e instanceof Error) return this.errorHandler(e, t)
      throw e
    }
    #s(e, t, r, s) {
      if (s === "HEAD")
        return (async () => new Response(null, await this.#s(e, t, r, "GET")))()
      let n = this.getPath(e, { env: r }),
        o = this.router.match(s, n),
        a = new Dn(e, {
          path: n,
          matchResult: o,
          env: r,
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
      let c = bn(o[0], this.errorHandler, this.#r)
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
    request = (e, t, r, s) =>
      e instanceof Request
        ? this.fetch(t ? new Request(e, t) : e, r, s)
        : ((e = e.toString()),
          this.fetch(
            new Request(
              /^https?:\/\//.test(e) ? e : `http://localhost${pt("/", e)}`,
              t,
            ),
            r,
            s,
          ))
    fire = () => {
      addEventListener("fetch", (e) => {
        e.respondWith(this.#s(e.request, e, void 0, e.request.method))
      })
    }
  }
At()
var di = []
function En(i, e) {
  let t = this.buildAllMatchers(),
    r = (s, n) => {
      let o = t[s] || t[ce],
        a = o[2][n]
      if (a) return a
      let c = n.match(o[0])
      if (!c) return [[], di]
      let d = c.indexOf("", 1)
      return [o[1][d], c]
    }
  return ((this.match = r), r(i, e))
}
var li = "[^/]+",
  Gt = ".*",
  Ct = "(?:|/.*)",
  ht = Symbol(),
  ac = new Set(".\\+*[^]$()")
function yh(i, e) {
  return i.length === 1
    ? e.length === 1
      ? i < e
        ? -1
        : 1
      : -1
    : e.length === 1
      ? 1
      : i === Gt || i === Ct
        ? e === Ct
          ? -1
          : 1
        : e === Gt || e === Ct
          ? -1
          : i === li
            ? 1
            : e === li
              ? -1
              : i.length === e.length
                ? i < e
                  ? -1
                  : 1
                : e.length - i.length
}
var cc = class Fn {
  #t
  #e
  #r = Object.create(null)
  insert(e, t, r, s, n) {
    let o = this
    for (let a = 0, c = e.length; a < c; a++) {
      let d = e[a],
        l =
          d.length === 1
            ? d === "*"
              ? a === c - 1
                ? ["", "", Gt]
                : ["", "", li]
              : null
            : d === "/*"
              ? ["", "", Ct]
              : d.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/),
        u
      if (l) {
        let p = l[1],
          h = l[2] || li
        if (
          p &&
          l[2] &&
          (h === ".*" ||
            ((h = h.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:")),
            /\((?!\?:)/.test(h)) ||
            (h.length === 1 && ac.has(h)))
        )
          throw ht
        if (((u = o.#r[h]), !u)) {
          if (h !== Gt && h !== Ct) {
            for (let f in o.#r)
              if ((h.length > 1 || f.length > 1) && f !== Gt && f !== Ct)
                throw ht
          }
          u = o.#r[h] = new Fn()
        }
        p !== "" && ((u.#e ??= s.varIndex++), r.push([p, u.#e]))
      } else if (((u = o.#r[d]), !u)) {
        for (let p in o.#r) if (p.length > 1 && p !== Gt && p !== Ct) throw ht
        u = o.#r[d] = new Fn()
      }
      o = u
    }
    if (o.#t !== void 0) throw ht
    o.#t = n ? -1 : t
  }
  buildRegExpStr() {
    let t = Object.keys(this.#r)
      .sort(yh)
      .map((r) => {
        let s = this.#r[r],
          n = s.buildRegExpStr()
        return n === ""
          ? ""
          : (typeof s.#e == "number"
              ? `(${r})@${s.#e}`
              : ac.has(r)
                ? `\\${r}`
                : r) + n
      })
      .filter(Boolean)
    return (
      typeof this.#t == "number" && this.#t !== -1 && t.unshift(`#${this.#t}`),
      t.length === 0 ? "" : t.length === 1 ? t[0] : "(?:" + t.join("|") + ")"
    )
  }
}
var In = class {
  #t = { varIndex: 0 }
  #e = new cc()
  #r = 0
  paths = Object.create(null)
  insert(i, e) {
    if (e) {
      this.#e.insert(i.split(""), 0, [], this.#t, !0)
      return
    }
    let t = [],
      r = [],
      s = i
    for (let o = 0; ; ) {
      let a = !1
      if (
        ((s = s.replace(/\{[^}]+\}/g, (c) => {
          let d = `@\\${o}`
          return ((r[o] = [d, c]), o++, (a = !0), d)
        })),
        !a)
      )
        break
    }
    let n = s.match(/(?::[^\/]+)|(?:\/\*$)|./g) || []
    for (let o = r.length - 1; o >= 0; o--) {
      let [a] = r[o]
      for (let c = n.length - 1; c >= 0; c--)
        if (n[c].indexOf(a) !== -1) {
          n[c] = n[c].replace(a, r[o][1])
          break
        }
    }
    ;(this.#e.insert(n, this.#r, t, this.#t, !1),
      (this.paths[i] = [this.#r++, t]))
  }
  buildRegExp() {
    let i = this.#e.buildRegExpStr()
    if (i === "") return [/^$/, [], []]
    let e = 0,
      t = [],
      r = []
    return (
      (i = i.replace(/#(\d+)|@(\d+)|\.\*\$/g, (s, n, o) =>
        n !== void 0
          ? ((t[++e] = Number(n)), "$()")
          : (o !== void 0 && (r[Number(o)] = ++e), ""),
      )),
      [new RegExp(`^${i}`), t, r]
    )
  }
}
var dc = Object.create(null)
function lc(i) {
  return (dc[i] ??= new RegExp(
    i === "*"
      ? ""
      : `^${i.replace(/\/\*$|([.\\+*[^\]$()])/g, (e, t) => (t ? `\\${t}` : "(?:|/.*)"))}$`,
  ))
}
function wh() {
  dc = Object.create(null)
}
function ui(i, e) {
  if (i) {
    for (let t of Object.keys(i).sort((r, s) => s.length - r.length))
      if (lc(t).test(e)) return [...i[t]]
  }
}
var pi = class {
  name = "RegExpRouter"
  #t
  #e
  #r
  constructor() {
    ;((this.#t = { [ce]: Object.create(null) }),
      (this.#e = { [ce]: Object.create(null) }),
      (this.#r = { [ce]: new In() }))
  }
  #n(i, e) {
    try {
      this.#r[i].insert(e, !/\*|\/:/.test(e))
    } catch (t) {
      throw t === ht ? new ci(e) : t
    }
  }
  add(i, e, t) {
    let r = this.#t,
      s = this.#e
    if (!r || !s) throw new Error(ai)
    ;(r[i] ||
      ((this.#r[i] = new In()),
      [r, s].forEach((a) => {
        ;((a[i] = Object.create(null)),
          Object.keys(a[ce]).forEach((c) => {
            ;((a[i][c] = [...a[ce][c]]), this.#n(i, c))
          }))
      })),
      e === "/*" && (e = "*"))
    let n = (e.match(/\/:/g) || []).length
    if (/\*$/.test(e)) {
      let a = lc(e)
      ;(Object.keys(r).forEach((c) => {
        ;(i === ce || i === c) &&
          !r[c][e] &&
          (this.#n(c, e), (r[c][e] = ui(r[c], e) || ui(r[ce], e) || []))
      }),
        Object.keys(r).forEach((c) => {
          ;(i === ce || i === c) &&
            Object.keys(r[c]).forEach((d) => {
              a.test(d) && r[c][d].push([t, n])
            })
        }),
        Object.keys(s).forEach((c) => {
          ;(i === ce || i === c) &&
            Object.keys(s[c]).forEach((d) => a.test(d) && s[c][d].push([t, n]))
        }))
      return
    }
    let o = ni(e) || [e]
    for (let a = 0, c = o.length; a < c; a++) {
      let d = o[a]
      Object.keys(s).forEach((l) => {
        ;(i === ce || i === l) &&
          (s[l][d] ||
            (this.#n(l, d),
            (s[l][d] = [...(ui(r[l], d) || ui(r[ce], d) || [])])),
          s[l][d].push([t, n - c + a + 1]))
      })
    }
  }
  match = En
  buildAllMatchers() {
    let i = Object.create(null)
    return (
      Object.keys(this.#e)
        .concat(Object.keys(this.#t))
        .forEach((e) => {
          i[e] ||= this.#i(e)
        }),
      (this.#t = this.#e = this.#r = void 0),
      wh(),
      i
    )
  }
  #i(i) {
    let e = this.#t[i],
      t = this.#e[i],
      r = this.#r[i],
      s = Object.create(null),
      n = []
    ;[e, t].forEach((l) => {
      for (let u in l) {
        let p = l[u],
          h = r.paths[u]
        if (!h) {
          s[u] = [p.map(([g]) => [g, Object.create(null)]), di]
          continue
        }
        let f = h[1]
        n[h[0]] = p.map(([g, w]) => {
          let m = Object.create(null)
          for (w -= 1; w >= 0; w--) {
            let [y, v] = f[w]
            m[y] = v
          }
          return [g, m]
        })
      }
    })
    let [o, a, c] = r.buildRegExp()
    for (let l = 0, u = n.length; l < u; l++)
      for (let p = 0, h = n[l].length; p < h; p++) {
        let f = n[l][p]?.[1]
        if (!f) continue
        let g = Object.keys(f)
        for (let w = 0, m = g.length; w < m; w++) f[g[w]] = c[f[g[w]]]
      }
    let d = []
    for (let l in a) d[l] = n[a[l]]
    return [o, d, s]
  }
}
var Rn = class {
  name = "SmartRouter"
  #t = []
  #e = []
  constructor(i) {
    this.#t = i.routers
  }
  add(i, e, t) {
    if (!this.#e) throw new Error(ai)
    this.#e.push([i, e, t])
  }
  match(i, e) {
    if (!this.#e) throw new Error("Fatal error")
    let t = this.#t,
      r = this.#e,
      s = t.length,
      n = 0,
      o
    for (; n < s; n++) {
      let a = t[n]
      try {
        for (let c = 0, d = r.length; c < d; c++) a.add(...r[c])
        o = a.match(i, e)
      } catch (c) {
        if (c instanceof ci) continue
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
At()
At()
var _r = Object.create(null),
  xh = (i) => {
    for (let e in i) return !0
    return !1
  },
  uc = class pc {
    #t
    #e
    #r
    #n = 0
    #i = _r
    constructor(e, t, r) {
      if (((this.#e = r || Object.create(null)), (this.#t = []), e && t)) {
        let s = Object.create(null)
        ;((s[e] = { handler: t, possibleKeys: [], score: 0 }), (this.#t = [s]))
      }
      this.#r = []
    }
    insert(e, t, r) {
      this.#n = ++this.#n
      let s = this,
        n = Ha(t),
        o = []
      for (let a = 0, c = n.length; a < c; a++) {
        let d = n[a],
          l = n[a + 1],
          u = Wa(d, l),
          p = Array.isArray(u) ? u[0] : d
        if (p in s.#e) {
          ;((s = s.#e[p]), u && o.push(u[1]))
          continue
        }
        ;((s.#e[p] = new pc()),
          u && (s.#r.push(u), o.push(u[1])),
          (s = s.#e[p]))
      }
      return (
        s.#t.push({
          [e]: {
            handler: r,
            possibleKeys: o.filter((a, c, d) => d.indexOf(a) === c),
            score: this.#n,
          },
        }),
        s
      )
    }
    #s(e, t, r, s, n) {
      for (let o = 0, a = t.#t.length; o < a; o++) {
        let c = t.#t[o],
          d = c[r] || c[ce],
          l = {}
        if (
          d !== void 0 &&
          ((d.params = Object.create(null)),
          e.push(d),
          s !== _r || (n && n !== _r))
        )
          for (let u = 0, p = d.possibleKeys.length; u < p; u++) {
            let h = d.possibleKeys[u],
              f = l[d.score]
            ;((d.params[h] = n?.[h] && !f ? n[h] : (s[h] ?? n?.[h])),
              (l[d.score] = !0))
          }
      }
    }
    search(e, t) {
      let r = []
      this.#i = _r
      let n = [this],
        o = Sn(t),
        a = [],
        c = o.length,
        d = null
      for (let l = 0; l < c; l++) {
        let u = o[l],
          p = l === c - 1,
          h = []
        for (let g = 0, w = n.length; g < w; g++) {
          let m = n[g],
            y = m.#e[u]
          y &&
            ((y.#i = m.#i),
            p
              ? (y.#e["*"] && this.#s(r, y.#e["*"], e, m.#i),
                this.#s(r, y, e, m.#i))
              : h.push(y))
          for (let v = 0, x = m.#r.length; v < x; v++) {
            let _ = m.#r[v],
              b = m.#i === _r ? {} : { ...m.#i }
            if (_ === "*") {
              let k = m.#e["*"]
              k && (this.#s(r, k, e, m.#i), (k.#i = b), h.push(k))
              continue
            }
            let [P, A, C] = _
            if (!u && !(C instanceof RegExp)) continue
            let S = m.#e[P]
            if (C instanceof RegExp) {
              if (d === null) {
                d = new Array(c)
                let F = t[0] === "/" ? 1 : 0
                for (let T = 0; T < c; T++) ((d[T] = F), (F += o[T].length + 1))
              }
              let k = t.substring(d[l]),
                D = C.exec(k)
              if (D) {
                if (
                  ((b[A] = D[0]),
                  this.#s(r, S, e, m.#i, b),
                  D[0].length === k.length &&
                    S.#e["*"] &&
                    this.#s(r, S.#e["*"], e, m.#i, b),
                  xh(S.#e))
                ) {
                  S.#i = b
                  let F = D[0].match(/\//)?.length ?? 0
                  ;(a[F] ||= []).push(S)
                }
                continue
              }
            }
            ;(C === !0 || C.test(u)) &&
              ((b[A] = u),
              p
                ? (this.#s(r, S, e, b, m.#i),
                  S.#e["*"] && this.#s(r, S.#e["*"], e, b, m.#i))
                : ((S.#i = b), h.push(S)))
          }
        }
        let f = a.shift()
        n = f ? h.concat(f) : h
      }
      return (
        r.length > 1 && r.sort((l, u) => l.score - u.score),
        [r.map(({ handler: l, params: u }) => [l, u])]
      )
    }
  }
var Bn = class {
  name = "TrieRouter"
  #t
  constructor() {
    this.#t = new uc()
  }
  add(i, e, t) {
    let r = ni(e)
    if (r) {
      for (let s = 0, n = r.length; s < n; s++) this.#t.insert(i, r[s], t)
      return
    }
    this.#t.insert(i, e, t)
  }
  match(i, e) {
    return this.#t.search(i, e)
  }
}
var X = class extends nc {
  constructor(i = {}) {
    ;(super(i),
      (this.router = i.router ?? new Rn({ routers: [new pi(), new Bn()] })))
  }
}
oi()
var hc = (i) => {
  let e = {
      origin: "*",
      allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH", "QUERY"],
      allowHeaders: [],
      exposeHeaders: [],
      ...i,
    },
    t = ((s) =>
      typeof s == "string"
        ? s === "*"
          ? () => s
          : (n) => (s === n ? n : null)
        : typeof s == "function"
          ? s
          : (n) => (s.includes(n) ? n : null))(e.origin),
    r = ((s) =>
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
      let d = await r(n.req.header("origin") || "", n)
      d.length && a("Access-Control-Allow-Methods", d.join(","))
      let l = e.allowHeaders
      if (!l?.length) {
        let u = n.req.header("Access-Control-Request-Headers")
        u && (l = u.split(",").map((p) => p.trim()))
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
ne()
Pe()
ne()
var Wr = (i) =>
  "/" +
  String(i || "")
    .split("/")
    .filter(Boolean)
    .join("/")
async function rr(i, e, t) {
  let s = Wr(i).split("/").filter(Boolean)
  if (s.length < 1) return { ok: !1, error: "Invalid share path" }
  let n, o
  if (s[0] === "@s") {
    if (s.length < 2) return { ok: !1, error: "Invalid share path" }
    ;((n = s[1]), (o = s.slice(2)))
  } else ((n = s[0]), (o = s.slice(1)))
  let a = await $(t),
    c = (a.shares || []).find((p) => p.id === n)
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
    j(a, t).catch(() => {}),
    c.files.length > 1 && o.length === 0)
  )
    return { ok: !0, share: c, virtualList: !0 }
  if (c.files.length === 1) {
    let p = Wr(c.files[0]),
      h = Wr([p, ...o].join("/"))
    return { ok: !0, share: c, realPath: h }
  }
  let d = o[0],
    l = c.files.find((p) => {
      let h = String(p).split("/").filter(Boolean)
      return h[h.length - 1] === d
    })
  if (!l) return { ok: !1, error: "path not found in share" }
  let u = Wr([Wr(l), ...o.slice(1)].join("/"))
  return { ok: !0, share: c, realPath: u }
}
ne()
Qe()
var Og = {
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
function jg(i) {
  return !i || i.role === 1
}
function ha(i) {
  return !!i && i.role === 2
}
function zg(i, e) {
  return !i || i.disabled
    ? !1
    : ha(i)
      ? !0
      : jg(i)
        ? !1
        : ((i.permission >> e) & 1) === 1
}
function Fe(i) {
  return zg(i, Og.WRITE_CONTENT)
}
function he(i, e = "/") {
  let t = e || "/"
  if (t.startsWith("/@s")) return t
  let r = (i?.base_path || "/").trim()
  if (!r || r === "/") return t.startsWith("/") ? t : `/${t}`
  ;(r.startsWith("/") || (r = `/${r}`),
    r.endsWith("/") && r.length > 1 && (r = r.replace(/\/+$/, "")))
  let s = t.startsWith("/") ? t : `/${t}`
  return s === "/" ? r : `${r}${s}`
}
ne()
Qe()
yt()
var Lg = 24 * 3600
async function Jr(i) {
  try {
    let e = await $(i?.env),
      t = {}
    for (let n of e.settings || []) t[n.key] = n.value
    let r = t.sign_all === "true",
      s = parseInt(t.link_expiration, 10) || 0
    return !r && s <= 0
      ? { enabled: !1, expiresIn: 0 }
      : { enabled: !0, expiresIn: s > 0 ? s : Lg }
  } catch {
    return { enabled: !1, expiresIn: 0 }
  }
}
async function fa(i, e, t) {
  let r = await He(i),
    s = Math.floor(Date.now() / 1e3) + t,
    n = await Zn(`${e}:${s}`, r)
  return `${s}.${n}`
}
async function wp(i, e, t) {
  let r = t.lastIndexOf(".")
  if (r <= 0) return !1
  let s = parseInt(t.slice(0, r), 10),
    n = t.slice(r + 1)
  if (!Number.isFinite(s) || s <= Math.floor(Date.now() / 1e3)) return !1
  let o = await He(i)
  return (await Zn(`${e}:${s}`, o)) === n
}
Vr()
Pe()
async function xp(i = {}, e) {
  let t = (i.parent || "/").replace(/\/+/g, "/") || "/",
    r = String(i.keywords || "")
      .trim()
      .toLowerCase(),
    s = i.scope ?? 0,
    n = Math.max(1, i.page || 1),
    o = Math.max(1, Math.min(100, i.per_page || 30)),
    a = i.max_depth ?? 10,
    c = i.max_results ?? 500,
    d = []
  async function l(f, g) {
    if (g > a || d.length >= c) return
    let w = []
    try {
      w = (await ct(f)).content || []
    } catch {
      return
    }
    for (let m of w) {
      if (d.length >= c) break
      let y = !r || m.name.toLowerCase().includes(r),
        v = !!m.is_dir,
        x = !0
      if (
        (s === 1 && !v && (x = !1),
        s === 2 && v && (x = !1),
        y &&
          x &&
          d.push({
            ...m,
            parent: f.endsWith("/") && f !== "/" ? f.slice(0, -1) : f,
          }),
        v)
      ) {
        let _ = f === "/" ? `/${m.name}` : `${f}/${m.name}`
        await l(_, g + 1)
      }
    }
  }
  await l(t, 0)
  let u = d.length,
    p = (n - 1) * o
  return { content: d.slice(p, p + o), total: u }
}
var me = new X(),
  Ie = (i) => {
    try {
      let e = i.executionCtx
      return !e || typeof e.waitUntil != "function"
        ? void 0
        : { waitUntil: (t) => e.waitUntil(t) }
    } catch {
      return
    }
  },
  Xe = (i) =>
    i.json({ code: 403, message: "Permission denied", data: null }, 403)
me.post("/dirs", async (i) => {
  let e = await i.req.json().catch(() => ({})),
    t = await te(i),
    r = e.path || "/"
  if (!r.startsWith("/@s") && (!t || t.disabled))
    return i.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let n = Ie(i),
    o = r
  ;(!e.force_root || !ha(t)) && (o = he(t, o))
  try {
    if (o.startsWith("/@s")) {
      let d = await rr(o, e.password || "", i.env)
      if (!d.ok) return i.json({ code: 400, message: d.error, data: null })
      if (d.virtualList) {
        let p = []
        for (let h of d.share.files || [])
          try {
            let { item: f } = await tr(h, n)
            if (f.is_dir) {
              let g = String(h).split("/").filter(Boolean)
              p.push({
                name: g[g.length - 1] || h,
                size: 0,
                is_dir: !0,
                modified: f.modified || new Date().toISOString(),
                sign: "",
                thumb: "",
                type: 1,
              })
            }
          } catch {}
        return i.json({ code: 200, message: "success", data: p })
      }
      let { content: l } = await ct(d.realPath, n),
        u = l
          .filter((p) => p.is_dir)
          .map((p) => ({
            name: p.name,
            size: 0,
            is_dir: !0,
            modified: p.modified || new Date().toISOString(),
            sign: p.sign || "",
            thumb: p.thumb || "",
            type: 1,
          }))
      return i.json({ code: 200, message: "success", data: u })
    }
    let { content: a } = await ct(o, n),
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
    return i.json({ code: 200, message: "success", data: c })
  } catch (a) {
    return i.json({ code: 500, message: ae(a), data: null })
  }
})
me.post("/list", async (i) => {
  let e = await i.req.json().catch(() => ({})),
    t = await te(i)
  if (!(e.path || "/").startsWith("/@s") && (!t || t.disabled))
    return i.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let s = Ie(i),
    n = he(t, e.path || "/"),
    o = parseInt(e.page, 10) || 1,
    a = parseInt(e.per_page, 10) || 0,
    c = (d) => {
      let l = d.length
      if (a <= 0) return { content: d, total: l }
      let p = (Math.max(1, o) - 1) * a,
        h = p + a
      return { content: d.slice(p, h), total: l }
    }
  try {
    if (n.startsWith("/@s")) {
      let x = await rr(n, e.password || "", i.env)
      if (!x.ok) return i.json({ code: 400, message: x.error, data: null })
      if (x.virtualList) {
        let S = []
        for (let F of x.share.files || []) {
          let T = String(F).split("/").filter(Boolean),
            O = T[T.length - 1] || F
          try {
            let { item: q } = await tr(F, s)
            S.push({
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
              ;(await ct(F, s),
                S.push({
                  name: O,
                  size: 0,
                  is_dir: !0,
                  modified: new Date().toISOString(),
                  sign: "",
                  thumb: "",
                  type: 1,
                }))
            } catch {
              S.push({
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
        let { content: k, total: D } = c(S)
        return i.json({
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
      let { content: _, provider: b } = await ct(x.realPath, s),
        P = _.map((S) => ({
          name: S.name,
          size: S.size,
          is_dir: S.is_dir,
          created: S.created || S.modified || new Date().toISOString(),
          modified: S.modified || new Date().toISOString(),
          sign: S.sign || "",
          thumb: S.thumb || "",
          type: S.type ?? 0,
        })),
        { content: A, total: C } = c(P)
      return i.json({
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
    let { content: d, provider: l, storage: u } = await ct(n, s),
      p = Fe(t),
      h = await Jr(i),
      f = await Promise.all(
        d.map(async (x) => {
          let _ = `${n}/${x.name}`.replace(/\/{2,}/g, "/"),
            b =
              !x.is_dir && h.enabled
                ? await fa(i, _, h.expiresIn)
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
      g = 0
    if (u && ((g = parseInt(u.page_size, 10) || 0), !g && u.addition))
      try {
        let x =
          typeof u.addition == "string" ? JSON.parse(u.addition) : u.addition
        g = parseInt(x?.page_size, 10) || 0
      } catch {}
    let w = a > 0 ? a : g > 0 ? g : 0,
      m = (x) => {
        let _ = x.length
        if (w <= 0) return { content: x, total: _ }
        let P = (Math.max(1, o) - 1) * w,
          A = P + w
        return { content: x.slice(P, A), total: _ }
      },
      { content: y, total: v } = m(f)
    return i.json({
      code: 200,
      message: "success",
      data: {
        content: y,
        total: v,
        readme: "",
        header: "",
        write: p,
        write_content_bypass: !1,
        provider: l,
        page_size: w > 0 ? w : void 0,
      },
    })
  } catch (d) {
    return i.json({ code: 500, message: ae(d), data: null })
  }
})
me.post("/get", async (i) => {
  let e = await i.req.json().catch(() => ({})),
    t = await te(i)
  if (!(e.path || "/").startsWith("/@s") && (!t || t.disabled))
    return i.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let s = Ie(i),
    n = he(t, e.path || "/")
  try {
    if (n.startsWith("/@s")) {
      let u = await rr(n, e.password || "", i.env)
      if (!u.ok) return i.json({ code: 400, message: u.error, data: null })
      if (u.virtualList) {
        let w = n.split("/").filter(Boolean)[1] || "share"
        return i.json({
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
      let p = n.split("/").filter(Boolean)[1] || "",
        { item: h, provider: f } = await tr(u.realPath, s),
        g = n.replace(/^\/@s\/[^/]+/, "")
      return i.json({
        code: 200,
        message: "success",
        data: {
          name: h.name,
          size: h.size,
          is_dir: h.is_dir,
          created: h.created || h.modified || new Date().toISOString(),
          modified: h.modified,
          sign: h.sign || "",
          thumb: h.thumb || "",
          type: h.type ?? 0,
          raw_url: `/api/sd/${p}${g}`,
          readme: u.share.readme || "",
          header: u.share.header || "",
          provider: f,
          related: [],
          write: !1,
          write_content_bypass: !1,
        },
      })
    }
    let { item: o, provider: a, rawUrl: c } = await tr(n, s),
      d = await Jr(i),
      l = !o.is_dir && d.enabled ? await fa(i, n, d.expiresIn) : o.sign || ""
    return i.json({
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
        write: Fe(t),
        write_content_bypass: !1,
      },
    })
  } catch (o) {
    return i.json({ code: 500, message: ae(o), data: null })
  }
})
me.post("/mkdir", async (i) => {
  let e = await te(i)
  if (!Fe(e)) return Xe(i)
  let t = await i.req.json().catch(() => ({})),
    r = he(e, t.path || "/"),
    s = Ie(i)
  try {
    return (
      await Ho(r, s),
      i.json({ code: 200, message: "success", data: null })
    )
  } catch (n) {
    return i.json({ code: 500, message: ae(n), data: null })
  }
})
me.post("/rename", async (i) => {
  let e = await te(i)
  if (!Fe(e)) return Xe(i)
  let { path: t, name: r } = await i.req.json().catch(() => ({})),
    s = Ie(i)
  try {
    let n = he(e, t || "/")
    return (
      await Wo(n, r, s),
      i.json({ code: 200, message: "success", data: null })
    )
  } catch (n) {
    return i.json({ code: 500, message: ae(n), data: null })
  }
})
me.post("/remove", async (i) => {
  let e = await te(i)
  if (!Fe(e)) return Xe(i)
  let { dir: t, names: r } = await i.req.json().catch(() => ({})),
    s = Ie(i)
  try {
    let n = he(e, t || "/")
    return (
      await Ko(n, r, s),
      i.json({ code: 200, message: "success", data: null })
    )
  } catch (n) {
    return i.json({ code: 500, message: ae(n), data: null })
  }
})
me.post("/move", async (i) => {
  let e = await te(i)
  if (!Fe(e)) return Xe(i)
  let {
      src_dir: t,
      dst_dir: r,
      names: s,
    } = await i.req.json().catch(() => ({})),
    n = Ie(i)
  try {
    let o = he(e, t || "/"),
      a = he(e, r || "/")
    return (
      await Go(o, a, s, n),
      i.json({ code: 200, message: "success", data: null })
    )
  } catch (o) {
    return i.json({ code: 500, message: ae(o), data: null })
  }
})
me.post("/copy", async (i) => {
  let e = await te(i)
  if (!Fe(e)) return Xe(i)
  let {
      src_dir: t,
      dst_dir: r,
      names: s,
    } = await i.req.json().catch(() => ({})),
    n = Ie(i)
  try {
    let o = he(e, t || "/"),
      a = he(e, r || "/")
    return (
      await Vo(o, a, s, n),
      i.json({ code: 200, message: "success", data: null })
    )
  } catch (o) {
    return i.json({ code: 500, message: ae(o), data: null })
  }
})
me.put("/put", async (i) => {
  let e = await te(i)
  if (!Fe(e)) return Xe(i)
  let t = decodeURIComponent(i.req.header("File-Path") || ""),
    r = he(e, t),
    s = Ie(i)
  try {
    let n = await i.req.arrayBuffer()
    return (
      await dn(r, Buffer.from(n), s),
      i.json({ code: 200, message: "success", data: null })
    )
  } catch (n) {
    return i.json({ code: 500, message: ae(n), data: null })
  }
})
me.put("/form", async (i) => {
  let e = await te(i)
  if (!Fe(e)) return Xe(i)
  let t = decodeURIComponent(i.req.header("File-Path") || ""),
    r = he(e, t),
    s = Ie(i)
  try {
    let o = (await i.req.formData()).get("file")
    if (!o || typeof o == "string")
      return i.json({
        code: 400,
        message: "missing file in form data",
        data: null,
      })
    let a = Buffer.from(await o.arrayBuffer())
    return (
      await dn(r, a, s),
      i.json({ code: 200, message: "success", data: null })
    )
  } catch (n) {
    return i.json({ code: 500, message: ae(n), data: null })
  }
})
me.post("/upload/create", async (i) => {
  let e = await te(i)
  if (!Fe(e)) return Xe(i)
  let {
      path: t,
      file_name: r,
      size: s,
      md5: n,
    } = await i.req.json().catch(() => ({})),
    o = he(e, t || "/"),
    a = Ie(i)
  if (!r)
    return i.json({
      code: 400,
      message: "path and file_name are required",
      data: null,
    })
  try {
    let c = await de(o)
    if (c.isVirtual) throw new Error("failed get storage: storage not found")
    let d = await re(c.storage.driver, c.storage)
    if (typeof d.createUploadSession != "function")
      return i.json({ code: 200, message: "success", data: null })
    let l
    try {
      l = await d.createUploadSession(o, c.physical, r, Number(s) || 0, n || "")
    } finally {
      await ve(c.storage.driver, c.storage, d, a)
    }
    return i.json({ code: 200, message: "success", data: l })
  } catch (c) {
    return i.json({ code: 500, message: ae(c), data: null })
  }
})
me.put("/upload/part", async (i) => {
  let e = await te(i)
  if (!Fe(e)) return Xe(i)
  let t = i.req.header("X-Upload-Session") || "",
    r = parseInt(i.req.header("X-Part-Number") || "0", 10),
    s = decodeURIComponent(i.req.header("Upload-Path") || ""),
    n = he(e, s),
    o = Ie(i)
  if (!t || !(r >= 1) || !n)
    return i.json({
      code: 400,
      message: "missing X-Upload-Session / X-Part-Number / Upload-Path",
      data: null,
    })
  try {
    let a = await de(n)
    if (a.isVirtual) throw new Error("failed get storage: storage not found")
    let c = await re(a.storage.driver, a.storage)
    if (typeof c.uploadPart != "function")
      throw new Error("storage does not support chunked upload")
    let d = Buffer.from(await i.req.arrayBuffer()),
      l
    try {
      l = await c.uploadPart(t, r, d)
    } finally {
      await ve(a.storage.driver, a.storage, c, o)
    }
    return i.json({ code: 200, message: "success", data: l ?? null })
  } catch (a) {
    return i.json({ code: 500, message: ae(a), data: null })
  }
})
me.post("/upload/complete", async (i) => {
  let e = await te(i)
  if (!Fe(e)) return Xe(i)
  let {
      path: t,
      session: r,
      partMd5s: s,
    } = await i.req.json().catch(() => ({})),
    n = he(e, t || "/"),
    o = Ie(i)
  if (!r)
    return i.json({
      code: 400,
      message: "path and session are required",
      data: null,
    })
  try {
    let a = await de(n)
    if (a.isVirtual) throw new Error("failed get storage: storage not found")
    let c = await re(a.storage.driver, a.storage)
    if (typeof c.completeUploadSession != "function")
      throw new Error("storage does not support chunked upload")
    try {
      await c.completeUploadSession(r, s)
    } finally {
      await ve(a.storage.driver, a.storage, c, o)
    }
    return i.json({ code: 200, message: "success", data: null })
  } catch (a) {
    return i.json({ code: 500, message: ae(a), data: null })
  }
})
me.post("/add_offline_download", async (i) => {
  let e = await te(i)
  if (!e || e.disabled)
    return i.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let { path: t, urls: r } = await i.req.json().catch(() => ({})),
    s = he(e, t || "/")
  return !r || r.length === 0
    ? i.json({ code: 400, message: "No URLs provided" })
    : i.json({
        code: 200,
        message:
          "Offline download task received (Note: background processing limited in Serverless mode)",
        data: null,
      })
})
me.post("/search", async (i) => {
  let e = await te(i)
  if (!e || e.disabled)
    return i.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let t = await i.req.json().catch(() => ({})),
    r = he(e, t.parent || "/")
  try {
    let s = await xp(
      {
        parent: r,
        keywords: t.keywords || "",
        scope: t.scope !== void 0 ? parseInt(t.scope, 10) : 0,
        page: t.page ? parseInt(t.page, 10) : 1,
        per_page: t.per_page ? parseInt(t.per_page, 10) : 30,
      },
      i.env,
    )
    return i.json({ code: 200, message: "success", data: s })
  } catch (s) {
    return i.json({ code: 500, message: ae(s), data: null }, 500)
  }
})
me.post("/other", async (i) => {
  let e = await te(i)
  if (!e || e.disabled)
    return i.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let t = await i.req.json().catch(() => ({})),
    r = he(e, t.path || "/"),
    s = t.method
  if (!s)
    return i.json(
      { code: 400, message: "Missing required parameter 'method'", data: null },
      400,
    )
  try {
    let n = await de(r)
    if (n.isVirtual || !n.storage)
      throw new Error("failed get storage: storage not found")
    let o = await re(n.storage.driver, n.storage)
    if (typeof o.other == "function") {
      let a = await o.other(s, n.relative, t)
      return i.json({ code: 200, message: "success", data: a })
    }
    return i.json(
      {
        code: 500,
        message: `Driver '${n.storage.driver}' does not support other method '${s}'`,
        data: null,
      },
      500,
    )
  } catch (n) {
    return i.json({ code: 500, message: ae(n), data: null }, 500)
  }
})
Gr()
ne()
Qe()
var ma = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
function Ng(i) {
  let e = String(i).toUpperCase().replace(/[\s=]/g, "")
  if (!e) throw new Error("Empty base32 secret")
  let t = [],
    r = 0,
    s = 0
  for (let n of e) {
    let o = ma.indexOf(n)
    if (o === -1) throw new Error(`Invalid base32 character: ${n}`)
    ;((r = (r << 5) | o),
      (s += 5),
      s >= 8 && (t.push((r >> (s - 8)) & 255), (s -= 8)))
  }
  return new Uint8Array(t)
}
function Mg(i) {
  let e = 0,
    t = 0,
    r = ""
  for (let s = 0; s < i.length; s++)
    for (e = (e << 8) | i[s], t += 8; t >= 5; )
      ((r += ma[(e >> (t - 5)) & 31]), (t -= 5))
  return (t > 0 && (r += ma[(e << (5 - t)) & 31]), r)
}
function _p(i = 20) {
  let e = new Uint8Array(i)
  return (crypto.getRandomValues(e), Mg(e))
}
async function Hg(i, e) {
  let t = await crypto.subtle.importKey(
      "raw",
      i,
      { name: "HMAC", hash: "SHA-1" },
      !1,
      ["sign"],
    ),
    r = await crypto.subtle.sign("HMAC", t, e)
  return new Uint8Array(r)
}
async function Wg(i, e = Date.now(), t = 30, r = 6) {
  let s = Math.floor(e / 1e3 / t),
    n = new Uint8Array(8),
    o = s
  for (let u = 7; u >= 0; u--) ((n[u] = o & 255), (o = Math.floor(o / 256)))
  let a = await Hg(Ng(i), n),
    c = a[a.length - 1] & 15,
    l =
      (((a[c] & 127) << 24) |
        ((a[c + 1] & 255) << 16) |
        ((a[c + 2] & 255) << 8) |
        (a[c + 3] & 255)) %
      Math.pow(10, r)
  return String(l).padStart(r, "0")
}
async function ga(i, e, t = 1, r = Date.now()) {
  if (!i || !e) return !1
  let s = String(e).trim()
  if (!/^\d{6}$/.test(s)) return !1
  for (let n = -t; n <= t; n++) if ((await Wg(i, r + n * 3e4)) === s) return !0
  return !1
}
function vp(i, e, t = "OpenListNext") {
  let r = encodeURIComponent(`${t}:${e}`),
    s = new URLSearchParams({
      secret: i,
      issuer: t,
      algorithm: "SHA1",
      digits: "6",
      period: "30",
    })
  return `otpauth://totp/${r}?${s.toString()}`
}
function bp(i) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(i)}`
}
ne()
function Kg(i) {
  let e = ""
  for (let t = 0; t < i.length; t++) e += String.fromCharCode(i[t])
  return btoa(e)
}
function kp(i) {
  let e = String(i || "")
      .replace(/[\s\r\n]/g, "")
      .replace(/-/g, "+")
      .replace(/_/g, "/"),
    t = e.length % 4,
    r = t ? e + "=".repeat(4 - t) : e
  try {
    let s = atob(r),
      n = new Uint8Array(s.length)
    for (let o = 0; o < s.length; o++) n[o] = s.charCodeAt(o)
    return n
  } catch {
    return null
  }
}
var Gg = [
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
function ya(i) {
  let e = String(i || "")
    .trim()
    .split(/\s+/)
  if (e.length < 2) return null
  let t = e[0]
  if (!Gg.includes(t)) return null
  let r = kp(e[1])
  return !r || r.length < 16
    ? null
    : {
        type: t,
        blobBase64: e[1].replace(/[\s\r\n]/g, ""),
        comment: e.slice(2).join(" ") || "",
      }
}
async function Pp(i) {
  let e = ya(i)
  if (!e) return null
  let t = kp(e.blobBase64)
  if (!t) return null
  let r = await crypto.subtle.digest(
      "SHA-256",
      t.buffer.slice(t.byteOffset, t.byteOffset + t.byteLength),
    ),
    s = new Uint8Array(r)
  return "SHA256:" + Kg(s).replace(/=+$/, "")
}
function Sp() {
  let i = globalThis
  return typeof i.crypto?.randomUUID == "function"
    ? i.crypto.randomUUID()
    : Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 10) +
        Math.random().toString(36).slice(2, 10)
}
async function nr(i, e) {
  let r = ((await $(e)).users || []).find((s) => s.id === i)
  return r ? r.ssh_keys || [] : []
}
async function Ap(i, e, t, r) {
  let s = ya(e)
  if (!s) throw new Error("Invalid OpenSSH public key format")
  let n = await Pp(e)
  if (!n) throw new Error("Failed to compute SSH key fingerprint")
  let o = await $(r),
    a = (o.users || []).find((d) => d.id === i)
  if (!a) throw new Error("User not found")
  if (
    (Array.isArray(a.ssh_keys) || (a.ssh_keys = []),
    a.ssh_keys.some((d) => d.fingerprint === n))
  )
    throw new Error("SSH key with this fingerprint already exists")
  let c = {
    id: Sp(),
    name: (t || s.comment || s.type).slice(0, 64),
    public_key: e.trim(),
    fingerprint: n,
    created_at: new Date().toISOString(),
  }
  return (a.ssh_keys.push(c), await j(o, r), c)
}
async function mn(i, e, t) {
  let r = await $(t),
    s = (r.users || []).find((o) => o.id === i)
  if (!s || !Array.isArray(s.ssh_keys)) return !1
  let n = s.ssh_keys.length
  return (
    (s.ssh_keys = s.ssh_keys.filter((o) => o.id !== e)),
    s.ssh_keys.length !== n ? (await j(r, t), !0) : !1
  )
}
var Ze = new X(),
  Qr = new X(),
  Vg = 5,
  Jg = 900 * 1e3,
  zt = new Map()
function Qg(i) {
  return (
    i.req.header("CF-Connecting-IP") ||
    i.req.header("x-real-ip") ||
    i.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  )
}
function wa(i, e) {
  return `${Qg(i)}|${String(e || "").toLowerCase()}`
}
function Cp(i, e) {
  if (zt.size > 1e4) {
    let r = Date.now()
    for (let [s, n] of zt) n.lockedUntil < r && n.count === 0 && zt.delete(s)
  }
  let t = zt.get(wa(i, e))
  return !!t && t.lockedUntil > Date.now()
}
function Tp(i, e) {
  let t = wa(i, e),
    r = Date.now(),
    s = zt.get(t) || { count: 0, lockedUntil: 0 }
  s.lockedUntil > r ||
    ((s.count += 1),
    s.count >= Vg && ((s.lockedUntil = r + Jg), (s.count = 0)),
    zt.set(t, s))
}
function Dp(i, e) {
  zt.delete(wa(i, e))
}
async function Ye(i) {
  let t = new TextEncoder().encode(`${i}-https://github.com/alist-org/alist`),
    r = await crypto.subtle.digest("SHA-256", t)
  return Array.from(new Uint8Array(r))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")
}
async function Ep(i) {
  let e = await $(i)
  if (!e.users || e.users.length === 0) {
    let t =
        (i && i.ADMIN_PASSWORD) ||
        (typeof process < "u" ? process.env?.ADMIN_PASSWORD : "") ||
        "",
      r = await Ye(t || "admin")
    ;((e.users = [
      {
        id: 1,
        username: "admin",
        password: r,
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
      await j(e, i))
  } else {
    let t = e.users.find((r) => r.username === "admin")
    if (t && (!t.password || String(t.password).trim() === "")) {
      let r =
        (i && i.ADMIN_PASSWORD) ||
        (typeof process < "u" ? process.env?.ADMIN_PASSWORD : "") ||
        ""
      ;((t.password = await Ye(r || "admin")), await j(e, i))
    }
  }
  return { db: e, users: e.users }
}
async function or(i) {
  let e = i.req.header("Authorization")
  if (!e) return null
  let t = e.startsWith("Bearer ") ? e.substring(7) : e
  try {
    let r = await He(i),
      s = await Pt(t, r, "HS256"),
      n = await $(i.env)
    n.users || (n.users = [])
    let o = n.users.find((a) => a.id === s.id || a.username === s.username)
    return o ? { db: n, user: o } : null
  } catch {
    return null
  }
}
async function Fp(i, e) {
  if (!i.otp_secret)
    return { ok: !0, code: 200, httpStatus: 200, message: "ok" }
  let t = String(e.otp_code || e.code || "").trim()
  return t
    ? (await ga(i.otp_secret, t))
      ? { ok: !0, code: 200, httpStatus: 200, message: "ok" }
      : { ok: !1, code: 401, httpStatus: 401, message: "Invalid OTP code" }
    : { ok: !1, code: 402, httpStatus: 200, message: "OTP code required" }
}
Ze.post("/login", async (i) => {
  let e = await i.req.json().catch(() => ({})),
    t = (e.username || "").trim(),
    r = e.password || ""
  if (Cp(i, t))
    return i.json(
      {
        code: 429,
        message:
          "Too many failed login attempts for this account/IP, please try again later",
        data: null,
      },
      429,
    )
  let s = await Ye(r),
    { users: n } = await Ep(i.env),
    o = n.find((a) => a.username === t && !a.disabled)
  if (o) {
    let a = o.password || ""
    if ((a !== "" && a === r) || a === s) {
      let d = await Fp(o, e)
      if (!d.ok)
        return i.json(
          { code: d.code, message: d.message, data: null },
          d.httpStatus,
        )
      Dp(i, t)
      let l = {
          id: o.id,
          username: o.username,
          role: o.role,
          exp: Math.floor(Date.now() / 1e3) + 3600 * 24 * 7,
        },
        u = await He(i),
        p = await Kr(l, u)
      return i.json({ code: 200, message: "success", data: { token: p } })
    }
  }
  return (
    Tp(i, t),
    i.json({ code: 401, message: "Invalid credentials", data: null }, 401)
  )
})
Ze.post("/login/hash", async (i) => {
  let e = await i.req.json().catch(() => ({})),
    t = (e.username || "").trim(),
    r = e.password || ""
  if (Cp(i, t))
    return i.json(
      {
        code: 429,
        message:
          "Too many failed login attempts for this account/IP, please try again later",
        data: null,
      },
      429,
    )
  let { users: s } = await Ep(i.env),
    n = s.find((o) => o.username === t && !o.disabled)
  if (n) {
    let o = n.password || "",
      a = o.length === 64 ? o : await Ye(o || "admin")
    if (r === o || r === a) {
      let d = await Fp(n, e)
      if (!d.ok)
        return i.json(
          { code: d.code, message: d.message, data: null },
          d.httpStatus,
        )
      Dp(i, t)
      let l = {
          id: n.id,
          username: n.username,
          role: n.role,
          exp: Math.floor(Date.now() / 1e3) + 3600 * 24 * 7,
        },
        u = await He(i),
        p = await Kr(l, u)
      return i.json({ code: 200, message: "success", data: { token: p } })
    }
  }
  return (
    Tp(i, t),
    i.json({ code: 401, message: "Invalid credentials", data: null }, 401)
  )
})
var xa = async (i) => {
    let e = await or(i)
    if (!e)
      return i.json({ code: 401, message: "Unauthorized", data: null }, 401)
    let { db: t, user: r } = e,
      s = await i.req.json().catch(() => ({}))
    if (s.username && s.username.trim() !== "") {
      let n = s.username.trim()
      if (t.users.some((a) => a.id !== r.id && a.username === n))
        return i.json(
          { code: 400, message: "Username already exists", data: null },
          400,
        )
      r.username = n
    }
    return (
      s.password &&
        s.password.trim() !== "" &&
        ((r.password = await Ye(s.password.trim())),
        (r.pwd_update_at = new Date().toISOString())),
      await j(t, i.env),
      i.json({ code: 200, message: "success", data: null })
    )
  },
  _a = async (i) => {
    let e = await te(i)
    return !e || e.disabled
      ? i.json({ code: 401, message: "Unauthorized", data: null }, 401)
      : i.json({
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
Ze.get("/me", _a)
Ze.post("/me/update", xa)
var Xr = (i) => i.json({ code: 200, message: "success", data: null })
Ze.get("/logout", Xr)
Ze.post("/logout", Xr)
Ze.post("/2fa/generate", async (i) => {
  let e = await or(i)
  if (!e) return i.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let { user: t } = e
  if (t.otp_secret)
    return i.json(
      { code: 400, message: "2FA already enabled", data: null },
      400,
    )
  let r = _p(),
    s = vp(r, t.username)
  return i.json({
    code: 200,
    message: "success",
    data: { qr: bp(s), secret: r },
  })
})
Ze.post("/2fa/verify", async (i) => {
  let e = await or(i)
  if (!e) return i.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let { db: t, user: r } = e,
    s = await i.req.json().catch(() => ({})),
    n = String(s.code || "").trim(),
    o = String(s.secret || "").trim()
  return o
    ? /^[A-Z2-7]+$/i.test(o)
      ? (await ga(o, n))
        ? ((r.otp_secret = o.toUpperCase()),
          await j(t, i.env),
          i.json({ code: 200, message: "success", data: null }))
        : i.json({ code: 400, message: "Invalid code", data: null }, 400)
      : i.json({ code: 400, message: "Invalid secret format", data: null }, 400)
    : i.json(
        { code: 400, message: "Missing secret parameter", data: null },
        400,
      )
})
Qr.get("/sshkey/list", async (i) => {
  let e = await or(i)
  if (!e) return i.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let t = await nr(e.user.id, i.env)
  return i.json({
    code: 200,
    message: "success",
    data: { content: t, total: t.length },
  })
})
Qr.post("/sshkey/add", async (i) => {
  let e = await or(i)
  if (!e) return i.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let t = await i.req.json().catch(() => ({}))
  try {
    let r = await Ap(
      e.user.id,
      t.key || t.public_key || "",
      t.name || t.title || "",
      i.env,
    )
    return i.json({ code: 200, message: "success", data: r })
  } catch (r) {
    return i.json(
      { code: 400, message: r.message || "Failed to add SSH key", data: null },
      400,
    )
  }
})
Qr.post("/sshkey/delete", async (i) => {
  let e = await or(i)
  if (!e) return i.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let t = i.req.query("id")
  if (!t)
    return i.json(
      { code: 400, message: "Missing id parameter", data: null },
      400,
    )
  if (!(await mn(e.user.id, t, i.env)))
    return i.json({ code: 404, message: "SSH key not found", data: null }, 404)
  let s = await nr(e.user.id, i.env)
  return i.json({ code: 200, message: "success", data: s })
})
ne()
Pe()
hn()
Vr()
ne()
Gr()
Qe()
var We = new X()
We.get("/list", async (i) => {
  let t = ((await $(i.env)).users || []).map((r) => ({
    id: r.id,
    username: r.username,
    role: r.role,
    permission: r.permission ?? 0,
    base_path: r.base_path || "/",
    disabled: !!r.disabled,
    sso_id: r.sso_id || "",
    allow_ldap: !!r.allow_ldap,
    pwd_update_at: r.pwd_update_at || "",
    otp: !!r.otp_secret,
  }))
  return i.json({
    code: 200,
    message: "success",
    data: { content: t, total: t.length },
  })
})
We.get("/get", async (i) => {
  let e = i.req.query("id")
  if (!e)
    return i.json(
      { code: 400, message: "Missing id parameter", data: null },
      400,
    )
  let t = parseInt(e, 10),
    s = ((await $(i.env)).users || []).find((n) => n.id === t)
  return s
    ? i.json({
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
    : i.json({ code: 404, message: "User not found", data: null }, 404)
})
We.post("/create", async (i) => {
  let e = await i.req.json().catch(() => ({}))
  if (!e.username)
    return i.json(
      { code: 400, message: "Username is required", data: null },
      400,
    )
  let t = await $(i.env)
  if (
    (t.users || (t.users = []), t.users.some((d) => d.username === e.username))
  )
    return i.json(
      { code: 400, message: "Username already exists", data: null },
      400,
    )
  let n = t.users.reduce((d, l) => Math.max(d, l.id || 0), 0) + 1,
    o = e.password || "123456",
    a = await Ye(o),
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
    await j(t, i.env),
    i.json({ code: 200, message: "success", data: null })
  )
})
We.post("/update", async (i) => {
  let e = await i.req.json().catch(() => ({}))
  if (!e.id)
    return i.json(
      { code: 400, message: "User ID is required", data: null },
      400,
    )
  let t = parseInt(e.id, 10),
    r = await $(i.env)
  r.users || (r.users = [])
  let s = r.users.findIndex((o) => o.id === t)
  if (s === -1)
    return i.json({ code: 404, message: "User not found", data: null }, 404)
  let n = r.users[s]
  if (e.username && e.username !== n.username) {
    if (r.users.some((a) => a.id !== t && a.username === e.username))
      return i.json(
        { code: 400, message: "Username already in use", data: null },
        400,
      )
    n.username = e.username
  }
  return (
    e.password &&
      e.password.trim() !== "" &&
      ((n.password = await Ye(e.password)),
      (n.pwd_update_at = new Date().toISOString())),
    e.role !== void 0 && (n.role = parseInt(e.role, 10)),
    e.permission !== void 0 && (n.permission = parseInt(e.permission, 10)),
    e.base_path !== void 0 && (n.base_path = e.base_path),
    e.disabled !== void 0 && (n.disabled = !!e.disabled),
    e.sso_id !== void 0 && (n.sso_id = e.sso_id),
    e.allow_ldap !== void 0 && (n.allow_ldap = !!e.allow_ldap),
    (r.users[s] = n),
    await j(r, i.env),
    i.json({ code: 200, message: "success", data: null })
  )
})
var Ip = async (i) => {
  let e = i.req.query("id")
  if (!e)
    return i.json(
      { code: 400, message: "Missing id parameter", data: null },
      400,
    )
  let t = parseInt(e, 10)
  if (t === 1)
    return i.json(
      { code: 400, message: "Cannot delete primary admin user", data: null },
      400,
    )
  let r = await $(i.env)
  return (
    r.users || (r.users = []),
    (r.users = r.users.filter((s) => s.id !== t)),
    await j(r, i.env),
    i.json({ code: 200, message: "success", data: null })
  )
}
We.post("/delete", Ip)
We.post("/cancel", Ip)
We.get("/sshkey/list", async (i) => {
  let e = parseInt(i.req.query("uid") || "0", 10),
    t = await nr(e, i.env)
  return i.json({
    code: 200,
    message: "success",
    data: { content: t, total: t.length },
  })
})
We.post("/sshkey/delete", async (i) => {
  let e = parseInt(i.req.query("uid") || "0", 10),
    t = i.req.query("id")
  if (!e || !t)
    return i.json(
      { code: 400, message: "Missing uid or id parameter", data: null },
      400,
    )
  if (!(await mn(e, t, i.env)))
    return i.json({ code: 404, message: "SSH key not found", data: null }, 404)
  let s = await nr(e, i.env)
  return i.json({ code: 200, message: "success", data: s })
})
We.post("/cancel_2fa", async (i) => {
  let e = parseInt(i.req.query("id") || "0", 10)
  if (!e)
    return i.json(
      { code: 400, message: "Missing id parameter", data: null },
      400,
    )
  let t = await $(i.env),
    r = (t.users || []).find((s) => s.id === e)
  return r
    ? (delete r.otp_secret,
      await j(t, i.env),
      i.json({ code: 200, message: "success", data: null }))
    : i.json({ code: 404, message: "User not found", data: null }, 404)
})
var Rp = async (i) => {
  let e = i.req.header("Authorization")
  if (!e) return i.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let t = e.startsWith("Bearer ") ? e.substring(7) : e
  try {
    let r = await He(i),
      s = await Pt(t, r, "HS256"),
      n = await i.req.json().catch(() => ({})),
      o = n.old_password || "",
      a = n.new_password || ""
    if (!a)
      return i.json(
        { code: 400, message: "New password is required", data: null },
        400,
      )
    let c = await $(i.env)
    c.users || (c.users = [])
    let d = c.users.findIndex((p) => p.id === s.id || p.username === s.username)
    if (d === -1)
      return i.json({ code: 404, message: "User not found", data: null }, 404)
    let l = c.users[d],
      u = await Ye(o)
    return l.password && l.password !== o && l.password !== u
      ? i.json(
          { code: 400, message: "Incorrect old password", data: null },
          400,
        )
      : ((l.password = await Ye(a)),
        (l.pwd_update_at = new Date().toISOString()),
        (c.users[d] = l),
        await j(c, i.env),
        i.json({ code: 200, message: "success", data: null }))
  } catch (r) {
    return i.json(
      {
        code: 401,
        message: `Unauthorized: ${r.message || "Invalid token"}`,
        data: null,
      },
      401,
    )
  }
}
var M = new X()
M.use("*", async (i, e) => {
  if (!(await Ot(i)))
    return i.json({ code: 401, message: "Unauthorized", data: null })
  await e()
})
M.get("/storage/list", async (i) => {
  let e = await $(i.env)
  return i.json({
    code: 200,
    message: "success",
    data: { content: e.storages, total: e.storages.length },
  })
})
M.post("/storage/load_all", async (i) => {
  let e = await $(i.env),
    t = [],
    r = 0,
    s = 0
  for (let n of e.storages || [])
    if (!n.disabled)
      try {
        ;(await re(n.driver, n),
          r++,
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
  return i.json({
    code: 200,
    message: "success",
    data: { loaded: r, failed: s, results: t },
  })
})
M.get("/storage/get", async (i) => {
  let e = parseInt(i.req.query("id") || "0", 10),
    r = (await $(i.env)).storages.find((s) => s.id === e)
  return r
    ? i.json({ code: 200, message: "success", data: r })
    : i.json({ code: 404, message: "storage not found", data: null })
})
var Bp = (i) => {
    let e = (i || "").toLowerCase().replace(/[^a-z0-9]/g, "")
    if (!e) return ""
    let r = Object.keys(gn).find(
      (s) =>
        s.toLowerCase() === e ||
        s.toLowerCase().replace(/[^a-z0-9]/g, "") === e,
    )
    return (
      r ||
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
                                      : e.includes("pikpak")
                                        ? "PikPak"
                                        : e.includes("seafile")
                                          ? "Seafile"
                                          : e.includes("yandex")
                                            ? "YandexDisk"
                                            : e.includes("terabox") ||
                                                e.includes("dubox")
                                              ? "Terabox"
                                              : e.includes("mediatrack") ||
                                                  e.includes("fenmiao")
                                                ? "MediaTrack"
                                                : e.includes("alias")
                                                  ? "Alias"
                                                  : i || "")
    )
  },
  Up = (i, e) => {
    let t = ""
    if (typeof e == "object" && e !== null)
      try {
        t = JSON.stringify(e)
      } catch {
        t = "{}"
      }
    else t = String(e || "{}")
    let r = (i || "").toLowerCase()
    if (r.includes("thunder") || r.includes("xunlei"))
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
M.post("/storage/create", async (i) => {
  let e = await i.req.json().catch(() => ({})),
    t = await $(i.env)
  if (
    !e.driver ||
    typeof e.driver != "string" ||
    e.driver.trim() === "" ||
    e.driver === "undefined" ||
    e.driver === "null"
  )
    return i.json(
      { code: 400, message: "Storage driver is required", data: null },
      400,
    )
  let r = String(e.mount_path || "").trim()
  if (r === "")
    return i.json(
      { code: 400, message: "Mount path is required", data: null },
      400,
    )
  let s = "/" + r.split("/").filter(Boolean).join("/")
  if (
    t.storages.some(
      (c) =>
        "/" + (c.mount_path || "").split("/").filter(Boolean).join("/") === s,
    )
  )
    return i.json({
      code: 400,
      message: "mount path already exists",
      data: null,
    })
  let n = Bp(e.driver),
    o = Up(n, e.addition || "{}"),
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
      ;(await (await re(a.driver, a)).init?.(), (a.status = "work"))
    } catch (c) {
      return (
        (a.status = c.message || String(c)),
        String(c.message || c).includes("unsupported driver") &&
          (a.disabled = !0),
        t.storages.push(a),
        await j(t, i.env),
        i.json({ code: 500, message: c.message || String(c), data: a })
      )
    }
  return (
    t.storages.push(a),
    await j(t, i.env),
    i.json({ code: 200, message: "success", data: a })
  )
})
M.post("/storage/update", async (i) => {
  let e = await i.req.json().catch(() => ({})),
    t = await $(i.env),
    r = String(e.mount_path || "").trim(),
    s = r !== "" ? "/" + r.split("/").filter(Boolean).join("/") : void 0
  if (
    s &&
    t.storages.some(
      (o) =>
        o.id !== e.id &&
        "/" + (o.mount_path || "").split("/").filter(Boolean).join("/") === s,
    )
  )
    return i.json({
      code: 400,
      message: "mount path already exists",
      data: null,
    })
  let n = t.storages.findIndex((o) => o.id === e.id)
  if (n !== -1) {
    let o = e.driver || t.storages[n].driver,
      a = Bp(o),
      c = Up(
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
        ;(await (await re(d.driver, d)).init?.(), (d.status = "work"))
      } catch (l) {
        return (
          (d.status = l.message || String(l)),
          String(l.message || l).includes("unsupported driver") &&
            (d.disabled = !0),
          (t.storages[n] = d),
          await j(t, i.env),
          i.json({
            code: 500,
            message: l.message || String(l),
            data: { id: d.id },
          })
        )
      }
    ;((t.storages[n] = d), await j(t, i.env))
  }
  return i.json({ code: 200, message: "success", data: null })
})
M.post("/storage/delete", async (i) => {
  let e = parseInt(i.req.query("id") || "0", 10),
    t = await $(i.env)
  return (
    (t.storages = t.storages.filter((r) => r.id !== e)),
    await j(t, i.env),
    i.json({ code: 200, message: "success", data: null })
  )
})
M.post("/storage/enable", async (i) => {
  let e = parseInt(i.req.query("id") || "0", 10),
    t = await $(i.env),
    r = t.storages.find((s) => s.id === e)
  if (r) {
    ;((r.disabled = !1), (r.modified = new Date().toISOString()))
    try {
      ;(await (await re(r.driver, r)).init?.(), (r.status = "work"))
    } catch (s) {
      return (
        (r.status = s.message || String(s)),
        await j(t, i.env),
        i.json({ code: 500, message: s.message || String(s), data: null })
      )
    }
    await j(t, i.env)
  }
  return i.json({ code: 200, message: "success", data: null })
})
M.post("/storage/disable", async (i) => {
  let e = parseInt(i.req.query("id") || "0", 10),
    t = await $(i.env),
    r = t.storages.find((s) => s.id === e)
  return (
    r && ((r.disabled = !0), await j(t, i.env)),
    i.json({ code: 200, message: "success", data: null })
  )
})
M.get("/driver/names", (i) =>
  i.json({
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
      "PikPak",
      "Seafile",
      "YandexDisk",
      "Terabox",
      "MediaTrack",
      "Alias",
    ],
  }),
)
var Q = [
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
  gn = {
    AliyundriveOpen: {
      name: "AliyundriveOpen",
      default_mount_path: "/aliyundrive",
      common: Q,
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
      common: Q.slice(0, 3),
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
      common: Q.slice(0, 3),
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
      common: Q,
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
      common: Q,
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
      common: Q,
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
      common: Q,
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
      common: Q,
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
      common: Q,
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
      common: Q,
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
      common: Q,
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
      common: Q,
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
      common: Q,
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
      common: Q,
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
      common: Q,
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
      common: Q,
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
      common: Q,
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
      common: Q,
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
      common: Q,
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
      common: Q,
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
    PikPak: {
      name: "PikPak",
      default_mount_path: "/pikpak",
      common: Q,
      additional: [
        { name: "root_folder_id", type: "string", default: "", required: !1 },
        { name: "username", type: "string", default: "", required: !0 },
        { name: "password", type: "string", default: "", required: !0 },
        {
          name: "platform",
          type: "select",
          options: "web,android,pc",
          default: "web",
          required: !0,
        },
        { name: "refresh_token", type: "text", default: "", required: !1 },
        { name: "captcha_token", type: "text", default: "", required: !1 },
        { name: "device_id", type: "string", default: "", required: !1 },
        {
          name: "disable_media_link",
          type: "bool",
          default: "true",
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
        name: "PikPak",
        local_sort: !0,
        only_local: !1,
        only_proxy: !1,
        no_cache: !1,
        no_upload: !1,
        need_ms: !1,
        default_root: "",
      },
    },
    Seafile: {
      name: "Seafile",
      default_mount_path: "/seafile",
      common: Q,
      additional: [
        { name: "address", type: "string", default: "", required: !0 },
        { name: "username", type: "string", default: "", required: !1 },
        { name: "password", type: "string", default: "", required: !1 },
        { name: "token", type: "string", default: "", required: !1 },
        { name: "repo_id", type: "string", default: "", required: !1 },
        { name: "repo_pwd", type: "string", default: "", required: !1 },
        {
          name: "root_folder_path",
          type: "string",
          default: "/",
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
        name: "Seafile",
        local_sort: !0,
        only_local: !1,
        only_proxy: !1,
        no_cache: !1,
        no_upload: !1,
        need_ms: !1,
        default_root: "/",
      },
    },
    YandexDisk: {
      name: "YandexDisk",
      default_mount_path: "/yandex",
      common: Q,
      additional: [
        { name: "refresh_token", type: "text", default: "", required: !0 },
        {
          name: "root_folder_path",
          type: "string",
          default: "/",
          required: !1,
        },
        { name: "use_online_api", type: "bool", default: "true", required: !1 },
        {
          name: "api_url_address",
          type: "string",
          default: "https://api.oplist.org/yandexui/renewapi",
          required: !1,
        },
        { name: "client_id", type: "string", default: "", required: !1 },
        { name: "client_secret", type: "string", default: "", required: !1 },
        {
          name: "order_by",
          type: "select",
          options: "name,path,created,modified,size",
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
        name: "YandexDisk",
        local_sort: !0,
        only_local: !1,
        only_proxy: !1,
        no_cache: !1,
        no_upload: !1,
        need_ms: !1,
        default_root: "/",
      },
    },
    Terabox: {
      name: "Terabox",
      default_mount_path: "/terabox",
      common: Q,
      additional: [
        { name: "cookie", type: "text", default: "", required: !0 },
        {
          name: "download_api",
          type: "select",
          options: "official,crack",
          default: "official",
          required: !1,
        },
        {
          name: "root_folder_path",
          type: "string",
          default: "/",
          required: !1,
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
      ],
      config: {
        name: "Terabox",
        local_sort: !0,
        only_local: !1,
        only_proxy: !0,
        no_cache: !1,
        no_upload: !1,
        need_ms: !1,
        default_root: "/",
      },
    },
    MediaTrack: {
      name: "MediaTrack",
      default_mount_path: "/mediatrack",
      common: Q,
      additional: [
        { name: "access_token", type: "text", default: "", required: !0 },
        { name: "project_id", type: "string", default: "", required: !1 },
        { name: "root_folder_id", type: "string", default: "", required: !1 },
        {
          name: "order_by",
          type: "select",
          options: "updated_at,title,size",
          default: "title",
          required: !1,
        },
        { name: "order_desc", type: "bool", default: "false", required: !1 },
      ],
      config: {
        name: "MediaTrack",
        local_sort: !0,
        only_local: !1,
        only_proxy: !1,
        no_cache: !1,
        no_upload: !1,
        need_ms: !1,
        default_root: "",
      },
    },
    Alias: {
      name: "Alias",
      default_mount_path: "/alias",
      common: Q,
      additional: [
        {
          name: "paths",
          type: "text",
          default: "",
          required: !0,
          help: "Newline-separated list of paths, e.g. /local or sub:/target",
        },
        {
          name: "read_conflict_policy",
          type: "select",
          options: "first,random,all",
          default: "first",
          required: !1,
        },
        {
          name: "write_conflict_policy",
          type: "select",
          options:
            "disabled,first,deterministic,deterministic_or_all,all,all_strict",
          default: "disabled",
          required: !1,
        },
        {
          name: "put_conflict_policy",
          type: "select",
          options:
            "disabled,first,deterministic,deterministic_or_all,all,all_strict,random,quota,quota_strict",
          default: "disabled",
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
        name: "Alias",
        local_sort: !0,
        only_local: !1,
        only_proxy: !1,
        no_cache: !0,
        no_upload: !1,
        need_ms: !1,
        default_root: "/",
      },
    },
  }
M.get("/driver/list", (i) =>
  i.json({ code: 200, message: "success", data: gn }),
)
M.get("/driver/info", (i) => {
  let e = i.req.query("driver") || "",
    t = gn[e] || gn.AliyundriveOpen
  return i.json({ code: 200, message: "success", data: t })
})
M.get("/setting/list", async (i) => {
  let e = await $(i.env),
    t = i.req.query("group"),
    r = i.req.query("groups"),
    s = e.settings || []
  if (t !== void 0) {
    let n = parseInt(t, 10)
    s = s.filter((o) => o.group === n)
  } else if (r !== void 0) {
    let n = r.split(",").map((o) => parseInt(o, 10))
    s = s.filter((o) => n.includes(o.group))
  }
  return i.json({ code: 200, message: "success", data: s })
})
M.post("/setting/save", async (i) => {
  let e = await i.req.json().catch(() => []),
    t = await $(i.env)
  t.settings || (t.settings = [])
  for (let s of e) {
    let n = t.settings.findIndex((o) => o.key === s.key)
    n !== -1
      ? ((t.settings[n].value = s.value),
        s.group !== void 0 && (t.settings[n].group = s.group))
      : t.settings.push(s)
  }
  let r = new Set()
  return (
    (t.settings = t.settings.filter((s) =>
      !s.key || r.has(s.key) ? !1 : (r.add(s.key), !0),
    )),
    await j(t, i.env),
    i.json({ code: 200, message: "success", data: null })
  )
})
M.post("/setting/default", async (i) => {
  let e = i.req.query("group")
  if (e === void 0)
    return i.json({ code: 400, message: "group is required", data: null })
  let t = parseInt(e, 10),
    r = await $(i.env)
  r.settings = (r.settings || []).filter((o) => o.group !== t)
  let s = Tr.settings.filter((o) => o.group === t),
    n = new Set(s.map((o) => o.key))
  return (
    (r.settings = r.settings.filter((o) => !n.has(o.key))),
    r.settings.push(...JSON.parse(JSON.stringify(s))),
    await j(r, i.env),
    i.json({ code: 200, message: "success", data: s })
  )
})
M.post("/setting/delete", async (i) => {
  let e = i.req.query("key")
  if (!e) return i.json({ code: 400, message: "key is required", data: null })
  let t = await $(i.env)
  return (
    (t.settings = (t.settings || []).filter((r) => r.key !== e)),
    await j(t, i.env),
    i.json({ code: 200, message: "success", data: null })
  )
})
function Xg(i = 32) {
  let e = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    t = ""
  for (let r = 0; r < i; r++)
    t += e.charAt(Math.floor(Math.random() * e.length))
  return t
}
M.post("/setting/reset_token", async (i) => {
  let e = await $(i.env),
    t = Xg(32),
    r = (e.settings || []).findIndex((s) => s.key === "token")
  return (
    r !== -1
      ? ((e.settings[r].value = t),
        e.settings[r].group !== 5 &&
          e.settings[r].group !== 0 &&
          (e.settings[r].group = 5))
      : (e.settings || (e.settings = []),
        e.settings.push({
          key: "token",
          value: t,
          type: "string",
          help: "115 / PikPak / Thunder Token",
          group: 5,
          flag: 0,
        })),
    await j(e, i.env),
    i.json({ code: 200, message: "success", data: t })
  )
})
var dt = async (i, e, t = 14) => {
  let r = await $(i)
  r.settings || (r.settings = [])
  for (let [s, n] of Object.entries(e)) {
    if (n === void 0) continue
    let o = r.settings.findIndex((a) => a.key === s)
    o !== -1
      ? (r.settings[o].value = n)
      : r.settings.push({
          key: s,
          value: n,
          type: "string",
          help: s,
          group: t,
          flag: 0,
        })
  }
  await j(r, i)
}
M.post("/setting/set_115", async (i) => {
  let e = await i.req.json().catch(() => ({}))
  return (
    await dt(i.env, { "115_temp_dir": e.temp_dir || "" }),
    i.json({ code: 200, message: "success", data: "success" })
  )
})
M.post("/setting/set_115_open", async (i) => {
  let e = await i.req.json().catch(() => ({}))
  return (
    await dt(i.env, { "115_open_temp_dir": e.temp_dir || "" }),
    i.json({ code: 200, message: "success", data: "success" })
  )
})
M.post("/setting/set_123_pan", async (i) => {
  let e = await i.req.json().catch(() => ({}))
  return (
    await dt(i.env, {
      "123_pan_temp_dir": e.temp_dir || "",
      "123_temp_dir": e.temp_dir || "",
    }),
    i.json({ code: 200, message: "success", data: "success" })
  )
})
M.post("/setting/set_123_open", async (i) => {
  let e = await i.req.json().catch(() => ({}))
  return (
    await dt(i.env, {
      "123_open_temp_dir": e.temp_dir || "",
      "123_open_callback_url": e.callback_url || "",
    }),
    i.json({ code: 200, message: "success", data: "success" })
  )
})
M.post("/setting/set_pikpak", async (i) => {
  let e = await i.req.json().catch(() => ({}))
  return (
    await dt(i.env, { pikpak_temp_dir: e.temp_dir || "" }),
    i.json({ code: 200, message: "success", data: "success" })
  )
})
M.post("/setting/set_thunder", async (i) => {
  let e = await i.req.json().catch(() => ({}))
  return (
    await dt(i.env, { thunder_temp_dir: e.temp_dir || "" }),
    i.json({ code: 200, message: "success", data: "success" })
  )
})
M.post("/setting/set_thunder_browser", async (i) => {
  let e = await i.req.json().catch(() => ({}))
  return (
    await dt(i.env, { thunder_browser_temp_dir: e.temp_dir || "" }),
    i.json({ code: 200, message: "success", data: "success" })
  )
})
M.post("/setting/set_thunderx", async (i) => {
  let e = await i.req.json().catch(() => ({}))
  return (
    await dt(i.env, { thunderx_temp_dir: e.temp_dir || "" }),
    i.json({ code: 200, message: "success", data: "success" })
  )
})
M.post("/setting/reset_token", async (i) => {
  let e =
    typeof crypto < "u" && typeof crypto.randomUUID == "function"
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).substring(2) +
        Math.random().toString(36).substring(2)
  return (
    await dt(i.env, { token: e }),
    i.json({ code: 200, message: "success", data: e })
  )
})
M.get("/meta/list", async (i) => {
  let e = await $(i.env)
  return i.json({
    code: 200,
    message: "success",
    data: { content: e.metas, total: e.metas.length },
  })
})
M.get("/meta/get", async (i) => {
  let e = parseInt(i.req.query("id") || "0", 10),
    r = ((await $(i.env)).metas || []).find((s) => s.id === e)
  return r
    ? i.json({ code: 200, message: "success", data: r })
    : i.json({ code: 404, message: "meta not found", data: null })
})
M.post("/meta/create", async (i) => {
  let e = await i.req.json().catch(() => ({})),
    t = await $(i.env)
  t.metas || (t.metas = [])
  let r =
    "/" +
    String(e.path || "")
      .split("/")
      .filter(Boolean)
      .join("/")
  if (!r || r === "/")
    return i.json({ code: 400, message: "path is required", data: null })
  if (t.metas.some((n) => n.path === r))
    return i.json({ code: 400, message: "meta already exists", data: null })
  let s = {
    id: t.metas.length ? Math.max(...t.metas.map((n) => n.id)) + 1 : 1,
    path: r,
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
    await j(t, i.env),
    i.json({ code: 200, message: "success", data: s })
  )
})
M.post("/meta/update", async (i) => {
  let e = await i.req.json().catch(() => ({})),
    t = await $(i.env)
  t.metas || (t.metas = [])
  let r = t.metas.findIndex((n) => n.id === e.id)
  if (r === -1)
    return i.json({ code: 404, message: "meta not found", data: null })
  let s =
    e.path !== void 0
      ? "/" + String(e.path).split("/").filter(Boolean).join("/")
      : t.metas[r].path
  return s && t.metas.some((n) => n.path === s && n.id !== e.id)
    ? i.json({ code: 400, message: "meta already exists", data: null })
    : ((t.metas[r] = {
        ...t.metas[r],
        ...(s ? { path: s } : {}),
        password: e.password !== void 0 ? e.password : t.metas[r].password,
        read_users:
          e.read_users !== void 0 ? e.read_users : t.metas[r].read_users,
        read_users_sub:
          e.read_users_sub !== void 0
            ? !!e.read_users_sub
            : t.metas[r].read_users_sub,
        write_users:
          e.write_users !== void 0 ? e.write_users : t.metas[r].write_users,
        write_users_sub:
          e.write_users_sub !== void 0
            ? !!e.write_users_sub
            : t.metas[r].write_users_sub,
        p_sub: e.p_sub !== void 0 ? !!e.p_sub : t.metas[r].p_sub,
        write: e.write !== void 0 ? !!e.write : t.metas[r].write,
        w_sub: e.w_sub !== void 0 ? !!e.w_sub : t.metas[r].w_sub,
        hide: e.hide !== void 0 ? e.hide : t.metas[r].hide,
        h_sub: e.h_sub !== void 0 ? !!e.h_sub : t.metas[r].h_sub,
        readme: e.readme !== void 0 ? e.readme : t.metas[r].readme,
        r_sub: e.r_sub !== void 0 ? !!e.r_sub : t.metas[r].r_sub,
        header: e.header !== void 0 ? e.header : t.metas[r].header,
        header_sub:
          e.header_sub !== void 0 ? !!e.header_sub : t.metas[r].header_sub,
      }),
      await j(t, i.env),
      i.json({ code: 200, message: "success", data: null }))
})
M.post("/meta/delete", async (i) => {
  let e = parseInt(i.req.query("id") || "0", 10),
    t = await $(i.env)
  return (
    t.metas || (t.metas = []),
    (t.metas = t.metas.filter((r) => r.id !== e)),
    await j(t, i.env),
    i.json({ code: 200, message: "success", data: null })
  )
})
M.route("/user", We)
M.get("/kv/status", async (i) => {
  let e = await Hn(i.env)
  return i.json({ code: 200, message: "success", data: e })
})
M.get("/index/progress", (i) =>
  i.json({
    code: 200,
    message: "success",
    data: { total: 0, current: 0, speed: 0 },
  }),
)
M.get("/scan/progress", (i) =>
  i.json({
    code: 200,
    message: "success",
    data: { total: 0, current: 0, speed: 0 },
  }),
)
M.get("/plugin/list", async (i) => {
  let e = await $(i.env)
  return (
    e.plugins || (e.plugins = []),
    i.json({
      code: 200,
      message: "success",
      data: { content: e.plugins, total: e.plugins.length },
    })
  )
})
M.get("/plugin/get", async (i) => {
  let e = i.req.query("id")
  if (!e) return i.json({ code: 400, message: "id is required", data: null })
  let t = await $(i.env)
  t.plugins || (t.plugins = [])
  let r = t.plugins.find((s) => s.id === e)
  return r
    ? i.json({ code: 200, message: "success", data: r })
    : i.json({ code: 404, message: "Plugin not found", data: null })
})
M.post("/plugin/install", async (i) => {
  try {
    let e = await i.req.json(),
      t = e
    if (e.manifest_url && typeof e.manifest_url == "string")
      try {
        let a = await fetch(e.manifest_url)
        if (!a.ok)
          return i.json({
            code: 400,
            message: `Failed to fetch plugin manifest from URL: HTTP ${a.status}`,
            data: null,
          })
        t = { ...(await a.json()), ...e }
      } catch (a) {
        return i.json({
          code: 400,
          message: `Network error fetching plugin manifest: ${ae(a, "unexpected network error")}`,
          data: null,
        })
      }
    if (!t.id || !t.name)
      return i.json({
        code: 400,
        message: "Plugin id and name are required",
        data: null,
      })
    let r = await $(i.env)
    r.plugins || (r.plugins = [])
    let s = r.plugins.findIndex((a) => a.id === t.id),
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
        created_at: s >= 0 ? r.plugins[s].created_at : n,
        updated_at: n,
      }
    return (
      s >= 0 ? (r.plugins[s] = o) : r.plugins.push(o),
      await j(r, i.env),
      i.json({ code: 200, message: "Plugin installed successfully", data: o })
    )
  } catch (e) {
    return i.json({
      code: 500,
      message: e.message || "Failed to install plugin",
      data: null,
    })
  }
})
M.post("/plugin/update", async (i) => {
  try {
    let e = await i.req.json()
    if (!e.id)
      return i.json({ code: 400, message: "Plugin id is required", data: null })
    let t = await $(i.env)
    t.plugins || (t.plugins = [])
    let r = t.plugins.findIndex((o) => o.id === e.id)
    if (r === -1)
      return i.json({ code: 404, message: "Plugin not found", data: null })
    let s = t.plugins[r],
      n = { ...s, ...e, id: s.id, updated_at: new Date().toISOString() }
    return (
      (t.plugins[r] = n),
      await j(t, i.env),
      i.json({ code: 200, message: "Plugin updated successfully", data: n })
    )
  } catch (e) {
    return i.json({
      code: 500,
      message: e.message || "Failed to update plugin",
      data: null,
    })
  }
})
M.post("/plugin/toggle", async (i) => {
  try {
    let e = await i.req.json()
    if (!e.id)
      return i.json({ code: 400, message: "Plugin id is required", data: null })
    let t = await $(i.env)
    t.plugins || (t.plugins = [])
    let r = t.plugins.findIndex((n) => n.id === e.id)
    if (r === -1)
      return i.json({ code: 404, message: "Plugin not found", data: null })
    let s = e.enabled !== void 0 ? !!e.enabled : !t.plugins[r].enabled
    return (
      (t.plugins[r].enabled = s),
      (t.plugins[r].updated_at = new Date().toISOString()),
      await j(t, i.env),
      i.json({
        code: 200,
        message: s ? "Plugin enabled" : "Plugin disabled",
        data: { id: e.id, enabled: s },
      })
    )
  } catch (e) {
    return i.json({
      code: 500,
      message: e.message || "Failed to toggle plugin",
      data: null,
    })
  }
})
M.post("/plugin/delete", async (i) => {
  try {
    let t = i.req.query("id")
    if (!t)
      try {
        t = (await i.req.json()).id
      } catch {}
    if (!t)
      return i.json({ code: 400, message: "Plugin id is required", data: null })
    let r = await $(i.env)
    r.plugins || (r.plugins = [])
    let s = r.plugins.length
    return (
      (r.plugins = r.plugins.filter((n) => n.id !== t)),
      r.plugins.length === s
        ? i.json({ code: 404, message: "Plugin not found", data: null })
        : (await j(r, i.env),
          i.json({
            code: 200,
            message: "Plugin deleted successfully",
            data: null,
          }))
    )
  } catch (e) {
    return i.json({
      code: 500,
      message: e.message || "Failed to delete plugin",
      data: null,
    })
  }
})
M.post("/plugin/batch_save", async (i) => {
  try {
    let e = await i.req.json(),
      t = Array.isArray(e) ? e : e.plugins
    if (!Array.isArray(t))
      return i.json({
        code: 400,
        message: "plugins array is required",
        data: null,
      })
    let r = await $(i.env)
    return (
      (r.plugins = t),
      await j(r, i.env),
      i.json({
        code: 200,
        message: "Plugins saved successfully",
        data: { count: t.length },
      })
    )
  } catch (e) {
    return i.json({
      code: 500,
      message: e.message || "Failed to batch save plugins",
      data: null,
    })
  }
})
ne()
ne()
function va(i, e) {
  let t = i.replace(/bytes=/, "").split("-"),
    r = parseInt(t[0], 10),
    s = t[1] ? parseInt(t[1], 10) : e - 1,
    n = s - r + 1
  return { start: r, end: s, chunksize: n }
}
Pe()
Qe()
Vr()
var wn = null,
  yn = null
async function Yg() {
  if (typeof process < "u" && process.release?.name === "node" && !wn)
    try {
      ;((wn = await import("fs/promises")),
        (yn = (await import("fs")).createReadStream))
    } catch {}
}
var et = new X(),
  Zg = (i) => {
    try {
      let e = i.executionCtx
      return !e || typeof e.waitUntil != "function"
        ? void 0
        : { waitUntil: (t) => e.waitUntil(t) }
    } catch {
      return
    }
  }
et.get("/*", async (i) => {
  await Yg()
  let e =
      i.req.query("proxy") === "true" ||
      i.req.path.startsWith("/p") ||
      i.req.path.startsWith("/api/p") ||
      i.req.path.startsWith("/sd") ||
      i.req.path.startsWith("/api/sd"),
    t = i.req.path
      .replace(/^\/api\/raw/, "")
      .replace(/^\/api\/d/, "")
      .replace(/^\/api\/sd/, "")
      .replace(/^\/api\/p/, "")
      .replace(/^\/raw/, "")
      .replace(/^\/d/, "")
      .replace(/^\/sd/, "")
      .replace(/^\/p/, ""),
    r = decodeURIComponent(t)
  try {
    let s = r,
      n = i.req.path.startsWith("/api/sd") || i.req.path.startsWith("/sd")
    if (n) {
      let d = await rr(s, i.req.query("pwd") || "", i.env)
      if (!d.ok) return i.text(d.error || "Share not found", 404)
      if (d.virtualList || !d.realPath)
        return i.text("Cannot download share root", 400)
      s = d.realPath
    } else {
      let d = await te(i)
      if (!d || d.disabled) return i.text("Unauthorized", 401)
    }
    if (!n && (await Jr(i)).enabled) {
      let l = i.req.query("sign") || ""
      if (!(await wp(i, s, l))) return i.text("Invalid or expired sign", 401)
    }
    let o = await de(s)
    if (o.isVirtual || !o.physical)
      return i.text("Cannot download virtual directory path", 400)
    if (o.storage) {
      let d = (o.storage.driver || "").toLowerCase().replace(/[^a-z0-9]/g, "")
      if (d !== "local")
        try {
          let l = await re(o.storage.driver, o.storage),
            u
          try {
            u = await l.get(s, o.physical)
          } finally {
            await ve(o.storage.driver, o.storage, l, Zg(i))
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
              let h = { ...(u.raw_url_headers || {}) }
              h["User-Agent"] ||
                (h["User-Agent"] =
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
              let f = i.req.header("Range")
              f && (h.Range = f)
              let g = await fetch(u.raw_url, { headers: h })
              ;(g.status === 412 &&
                (console.warn(
                  `[rawRouter] Upstream returned 412 for '${s}', retrying without Range header...`,
                ),
                delete h.Range,
                (g = await fetch(u.raw_url, { headers: h }))),
                i.header("Access-Control-Allow-Origin", "*"),
                i.header("Access-Control-Allow-Methods", "GET, OPTIONS, HEAD"),
                i.header(
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
                m = s.split(".").pop()?.toLowerCase() || "",
                y = w[m] || "application/octet-stream"
              i.header("Content-Type", g.headers.get("content-type") || y)
              let v = g.headers.get("content-length")
              v && i.header("Content-Length", v)
              let x = g.headers.get("content-range")
              ;(x && i.header("Content-Range", x),
                i.header(
                  "Accept-Ranges",
                  g.headers.get("accept-ranges") || "bytes",
                ))
              let _ = g.headers.get("etag")
              _ && i.header("ETag", _)
              let b = g.headers.get("last-modified")
              b && i.header("Last-Modified", b)
              let P = g.headers.get("cache-control")
              P && i.header("Cache-Control", P)
              let A = g.headers.get("content-disposition")
              return (
                A && i.header("Content-Disposition", A),
                i.body(g.body, g.status)
              )
            } else
              return (
                console.log(
                  `[rawRouter] Redirecting download for '${s}' via ${o.storage.driver}`,
                ),
                i.redirect(u.raw_url, 302)
              )
          else if (typeof l.createReadStream == "function" && u && !u.is_dir) {
            i.header("Access-Control-Allow-Origin", "*")
            let p = u.size || 0,
              h = i.req.header("Range")
            if (h && p > 0) {
              let { start: f, end: g, chunksize: w } = va(h, p),
                m = await l.createReadStream(o.physical, { start: f, end: g })
              return (
                i.header("Content-Range", `bytes ${f}-${g}/${p}`),
                i.header("Accept-Ranges", "bytes"),
                i.header("Content-Length", w.toString()),
                i.header("Content-Type", "application/octet-stream"),
                i.body(m, 206)
              )
            } else {
              ;(p > 0 && i.header("Content-Length", p.toString()),
                i.header("Accept-Ranges", "bytes"),
                i.header("Content-Type", "application/octet-stream"))
              let f = await l.createReadStream(o.physical)
              return i.body(f)
            }
          } else {
            let p =
              u?.raw_url_error ||
              (u?.is_dir
                ? "\u8BE5\u6761\u76EE\u662F\u6587\u4EF6\u5939\uFF0C\u4E0D\u53EF\u4F5C\u4E3A\u6587\u4EF6\u4E0B\u8F7D\u3002"
                : "\u8BE5\u5B58\u50A8\u9A71\u52A8\u672A\u8FD4\u56DE\u4E0B\u8F7D\u94FE\u63A5\uFF08raw_url \u4E3A\u7A7A\uFF09\u3002")
            return i.text(
              `File not found or no download link available: ${s}
${p}`,
              404,
            )
          }
        } catch (l) {
          return (
            console.error(
              `[rawRouter] Driver get failed for '${s}':`,
              l.message,
            ),
            i.text(`Download failed: ${ae(l)}`, 500)
          )
        }
    }
    if (!wn || !yn)
      return i.text("Local file streaming not supported in Edge Runtime", 500)
    let a = await wn.stat(o.physical)
    if (a.isDirectory()) return i.text("Cannot download directory", 400)
    i.header("Access-Control-Allow-Origin", "*")
    let c = i.req.header("Range")
    if (c) {
      let { start: d, end: l, chunksize: u } = va(c, a.size),
        p = yn(o.physical, { start: d, end: l })
      return (
        i.header("Content-Range", `bytes ${d}-${l}/${a.size}`),
        i.header("Accept-Ranges", "bytes"),
        i.header("Content-Length", u.toString()),
        i.header("Content-Type", "application/octet-stream"),
        i.body(p, 206)
      )
    } else {
      ;(i.header("Content-Length", a.size.toString()),
        i.header("Accept-Ranges", "bytes"))
      let d = yn(o.physical)
      return i.body(d)
    }
  } catch (s) {
    return (
      console.error(`[rawRouter] Download 404 for '${r}':`, s.message),
      i.text(`Not found: ${ae(s, "file not found")}`, 404)
    )
  }
})
ne()
var ar = new X()
ar.get("/settings", async (i) => {
  let e = await $(i.env),
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
  let r = (e.users || []).find((n) => n.username === "guest")
  return (
    !!!(r && !r.disabled) || t.allow_guest === "false"
      ? (t.allow_guest = "false")
      : (t.allow_guest = "true"),
    i.json({ code: 200, message: "success", data: t })
  )
})
ar.get("/archive_extensions", (i) =>
  i.json({
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
ar.get("/offline_download_tools", (i) =>
  i.json({ code: 200, message: "success", data: [] }),
)
ar.get("/plugins", async (i) => {
  let r = ((await $(i.env)).plugins || []).filter((s) => s.enabled)
  return i.json({ code: 200, message: "success", data: r })
})
function ey() {
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
function ty() {
  return [
    {
      uri: "openlistnext://storage/metrics",
      name: "Storage Metrics",
      mimeType: "application/json",
      description: "Current storage metrics of OpenListNext",
    },
  ]
}
function ry() {
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
function $p(i, e, t) {
  switch (i) {
    case "tools/list":
      return { jsonrpc: "2.0", result: { tools: ey() }, id: e }
    case "resources/list":
      return { jsonrpc: "2.0", result: { resources: ty() }, id: e }
    case "prompts/list":
      return { jsonrpc: "2.0", result: { prompts: ry() }, id: e }
    default:
      return {
        jsonrpc: "2.0",
        error: { code: -32601, message: "Method not found" },
        id: e,
      }
  }
}
Qe()
var Yr = new X()
Yr.use("*", Se)
Yr.get(
  "/sse",
  (i) => (
    i.header("Content-Type", "text/event-stream"),
    i.header("Cache-Control", "no-cache"),
    i.header("Connection", "keep-alive"),
    i.text(`event: endpoint
data: /api/mcp/messages

`)
  ),
)
Yr.post("/messages", async (i) => {
  let e = await i.req.json().catch(() => ({})),
    { method: t, id: r, params: s } = e
  if (!t)
    return i.json(
      {
        jsonrpc: "2.0",
        error: { code: -32600, message: "Invalid Request" },
        id: r || null,
      },
      400,
    )
  let n = $p(t, r, s),
    o = n.error ? 404 : 200
  return i.json(n, o)
})
ne()
hn()
var ba = new X()
ba.get("/info", async (i) => {
  let e = await Ot(i),
    t = await $(i.env),
    r = {
      runtime: "Cloudflare Workers / Edge",
      timestamp: new Date().toISOString(),
    }
  return (
    e &&
      (r.db_state = {
        storages_count: t.storages?.length || 0,
        users_count: t.users?.length || 0,
        metas_count: t.metas?.length || 0,
        settings_count: t.settings?.length || 0,
      }),
    i.json({
      code: 200,
      message: "OpenListNext debug profile generated",
      data: r,
    })
  )
})
ne()
Qe()
var xe = new X()
xe.use("/list", Se)
xe.use("/get", Se)
xe.use("/update", Se)
xe.use("/delete", Se)
xe.use("/cancel", Se)
xe.use("/enable", Se)
xe.use("/disable", Se)
xe.get("/list", async (i) => {
  let e = await $(i.env)
  return i.json({
    code: 200,
    message: "success",
    data: { content: e.shares || [], total: (e.shares || []).length },
  })
})
xe.get("/get", async (i) => {
  let e = i.req.query("id") || "",
    r = ((await $(i.env)).shares || []).find((s) => s.id === e)
  return r
    ? i.json({ code: 200, message: "success", data: r })
    : i.json({ code: 404, message: "share not found", data: null })
})
xe.post("/create", async (i) => {
  let e = await te(i)
  if (!e) return i.json({ code: 401, message: "Unauthorized", data: null }, 401)
  let t = await i.req.json().catch(() => ({})),
    r = await $(i.env),
    s = t.id && String(t.id).trim() !== "" ? String(t.id).trim() : iy()
  if ((r.shares || []).some((o) => o.id === s))
    return i.json({ code: 400, message: "share id already exists", data: null })
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
    r.shares || (r.shares = []),
    r.shares.push(n),
    await j(r, i.env),
    i.json({ code: 200, message: "success", data: n })
  )
})
function iy() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16)
}
xe.post("/update", async (i) => {
  let e = await i.req.json().catch(() => ({})),
    t = await $(i.env)
  if (!e.id)
    return i.json({ code: 400, message: "share id is required", data: null })
  let r = (t.shares || []).findIndex((n) => n.id === e.id)
  if (r === -1)
    return i.json({ code: 404, message: "share not found", data: null })
  let s =
    e.new_id && String(e.new_id).trim() !== "" ? String(e.new_id).trim() : e.id
  return s !== e.id && (t.shares || []).some((o) => o.id === s && o.id !== e.id)
    ? i.json({ code: 400, message: "share id already exists", data: null })
    : ((t.shares[r] = {
        ...t.shares[r],
        id: s,
        new_id: s,
        expires: e.expires !== void 0 ? e.expires : t.shares[r].expires,
        pwd: e.pwd !== void 0 ? e.pwd : t.shares[r].pwd,
        max_accessed:
          e.max_accessed !== void 0 ? e.max_accessed : t.shares[r].max_accessed,
        disabled: e.disabled !== void 0 ? e.disabled : t.shares[r].disabled,
        order_by: e.order_by !== void 0 ? e.order_by : t.shares[r].order_by,
        order_direction:
          e.order_direction !== void 0
            ? e.order_direction
            : t.shares[r].order_direction,
        extract_folder:
          e.extract_folder !== void 0
            ? e.extract_folder
            : t.shares[r].extract_folder,
        files: e.files !== void 0 ? e.files : t.shares[r].files,
        remark: e.remark !== void 0 ? e.remark : t.shares[r].remark,
        readme: e.readme !== void 0 ? e.readme : t.shares[r].readme,
        header: e.header !== void 0 ? e.header : t.shares[r].header,
      }),
      await j(t, i.env),
      i.json({ code: 200, message: "success", data: null }))
})
xe.post("/delete", async (i) => {
  let e = i.req.query("id") || "",
    t = await $(i.env)
  return (
    t.shares || (t.shares = []),
    (t.shares = t.shares.filter((r) => r.id !== e)),
    await j(t, i.env),
    i.json({ code: 200, message: "success", data: null })
  )
})
xe.post("/enable", async (i) => {
  let e = i.req.query("id") || "",
    t = await $(i.env),
    r = (t.shares || []).find((s) => s.id === e)
  return (
    r && ((r.disabled = !1), await j(t, i.env)),
    i.json({ code: 200, message: "success", data: null })
  )
})
xe.post("/disable", async (i) => {
  let e = i.req.query("id") || "",
    t = await $(i.env),
    r = (t.shares || []).find((s) => s.id === e)
  return (
    r && ((r.disabled = !0), await j(t, i.env)),
    i.json({ code: 200, message: "success", data: null })
  )
})
ne()
Pe()
Qe()
var Ae = new X()
Ae.all("/refresh", Se, async (i) => {
  let e = await $(i.env),
    t = 0,
    r = 0,
    s = []
  for (let n of e.storages || [])
    if (!n.disabled)
      try {
        ;(await (await re(n.driver, n)).init?.(),
          (n.status = "work"),
          t++,
          s.push({
            id: n.id,
            mount_path: n.mount_path,
            driver: n.driver,
            status: "ok",
          }))
      } catch (o) {
        ;(r++,
          s.push({
            id: n.id,
            mount_path: n.mount_path,
            driver: n.driver,
            status: "failed",
            error: o?.message || String(o),
          }))
      }
  return (
    await j(e, i.env),
    i.json({
      code: 200,
      message: "token refresh executed",
      data: {
        refreshed: t,
        failed: r,
        total: e.storages?.length || 0,
        results: s,
      },
    })
  )
})
var Lt = { upload: [], copy: [], move: [], offline_download: [] }
Ae.use("*", Se)
Ae.get("/:type/:state", (i) => {
  let e = i.req.param("type"),
    t = i.req.param("state"),
    s = (Lt[e] || []).filter((n) => (t === "done" ? n.done : !n.done))
  return i.json({ code: 200, message: "success", data: s })
})
Ae.post("/:type/clear_done", (i) => {
  let e = i.req.param("type")
  return (
    Lt[e] && (Lt[e] = Lt[e].filter((t) => !t.done)),
    i.json({ code: 200, message: "success", data: null })
  )
})
Ae.post("/:type/clear_succeeded", (i) => {
  let e = i.req.param("type")
  return (
    Lt[e] && (Lt[e] = Lt[e].filter((t) => t.state !== "succeeded")),
    i.json({ code: 200, message: "success", data: null })
  )
})
Ae.post("/:type/retry_failed", (i) =>
  i.json({ code: 200, message: "success", data: null }),
)
Ae.post("/:type/retry", (i) =>
  i.json({ code: 200, message: "success", data: null }),
)
Ae.post("/:type/retry_some", (i) =>
  i.json({ code: 200, message: "success", data: null }),
)
Ae.post("/:type/cancel", (i) =>
  i.json({ code: 200, message: "success", data: null }),
)
Ae.post("/:type/cancel_some", (i) =>
  i.json({ code: 200, message: "success", data: null }),
)
Ae.post("/:type/delete", (i) =>
  i.json({ code: 200, message: "success", data: null }),
)
Ae.post("/:type/delete_some", (i) =>
  i.json({ code: 200, message: "success", data: null }),
)
var Zr = new Map(),
  cr = new Map()
function sy(i) {
  return (
    i.req.header("CF-Connecting-IP") ||
    i.req.header("x-real-ip") ||
    i.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  )
}
function ny() {
  let i = Date.now()
  if (Zr.size > 2e4) for (let [e, t] of Zr) i - t.start > 6e4 && Zr.delete(e)
  if (cr.size > 2e4) for (let [e, t] of cr) i - t.start > 36e5 && cr.delete(e)
}
async function oy(i, e) {
  let t = sy(i),
    r = Date.now(),
    s = 0,
    n = 0
  try {
    let o = await $(i.env),
      a = {}
    for (let c of o.settings || []) a[c.key] = c.value
    ;((s = parseInt(a.ip_limit, 10) || 0),
      (n = parseInt(a.traffic_limit, 10) || 0))
  } catch {}
  if ((ny(), s > 0)) {
    let o = Zr.get(t)
    if (!o || r - o.start > 6e4) Zr.set(t, { start: r, count: 1 })
    else if (((o.count += 1), o.count > s))
      return i.json(
        { code: 429, message: "Too many requests, slow down", data: null },
        429,
      )
  }
  if (n > 0) {
    let o = cr.get(t),
      a = n * 1024 * 1024
    if (o && r - o.start <= 36e5 && o.bytes >= a)
      return i.json(
        { code: 429, message: "Traffic limit exceeded", data: null },
        429,
      )
  }
  if (
    (await e(),
    (i.req.query("token") || i.req.query("access_token")) &&
      (i.res?.headers?.set("Referrer-Policy", "no-referrer"),
      i.res?.headers?.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate",
      ),
      i.res?.headers?.set("Pragma", "no-cache")),
    n > 0)
  ) {
    let o = parseInt(i.res?.headers?.get("content-length") || "0", 10) || 0
    if (o > 0) {
      let a = cr.get(t)
      !a || r - a.start > 36e5
        ? cr.set(t, { start: r, bytes: o })
        : (a.bytes += o)
    }
  }
}
function qp(i) {
  ;(i.use("*", oy),
    i.use("*", async (e, t) => {
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
    i.use(
      "*",
      hc({
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
    i.route("/raw", et),
    i.route("/fs", me),
    i.route("/auth", Ze),
    i.route("/public", ar),
    i.route("/admin", M),
    i.route("/mcp", Yr),
    i.route("/debug", ba),
    i.route("/share", xe),
    i.route("/task", Ae),
    i.route("/d", et),
    i.route("/sd", et),
    i.route("/p", et),
    i.route("/me", Qr),
    i.get("/me", _a),
    i.post("/me/update", xa),
    i.post("/user/update_pwd", Rp),
    i.get("/logout", Xr),
    i.post("/logout", Xr),
    i.get("/health", (e) =>
      e.json({
        ok: !0,
        name: "OpenListNext",
        version: "v4.2.3",
        environment: e.env?.ENVIRONMENT || "development",
      }),
    ))
}
ne()
var Nt = new X()
Nt.use("*", async (i, e) => {
  ;(Mn(i.env), await e())
})
var Op = new X()
qp(Op)
Nt.route("/api", Op)
Nt.route("/d", et)
Nt.route("/sd", et)
Nt.route("/p", et)
var ka = null
function jp(i) {
  ka = i
}
Nt.all("*", async (i) => {
  let e = i.env
  if (e && e.ASSETS && typeof e.ASSETS.fetch == "function") {
    let t = new URL(i.req.url),
      r = await e.ASSETS.fetch(i.req.raw)
    if (r.status !== 404) {
      if (t.pathname === "/" || t.pathname === "/index.html") {
        let n = new Headers(r.headers)
        return (
          n.set("Cache-Control", "no-cache, must-revalidate"),
          new Response(r.body, { status: r.status, headers: n })
        )
      }
      return r
    }
    let s = new Request(`${t.origin}/index.html`, i.req.raw)
    return e.ASSETS.fetch(s)
  }
  return ka && (i.req.method === "GET" || i.req.method === "HEAD")
    ? i.body(ka, 200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, must-revalidate",
      })
    : i.text("404 Not Found", 404)
})
var zp = Nt
var Lp = `<!doctype html>
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
jp(Lp)
function cy(i) {
  return zp.fetch(i.request, i.env, i)
}
var kS = cy
export { kS as default, cy as onRequest }
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
