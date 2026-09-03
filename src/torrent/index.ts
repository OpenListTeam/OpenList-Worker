/**
 * Torrent / 磁力链解析器
 * 
 * 对齐 Go 后端 server/handles/torrent.go
 * 纯 TypeScript 实现 bencode 解析，兼容 Cloudflare Workers。
 */
export { TorrentParser } from './TorrentParser';