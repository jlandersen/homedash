package api

import (
	"io/fs"
	"mime"
	"net/http"
	"net/url"
	"path"
	"strings"
)

type staticHandler struct {
	fs   fs.FS
	base http.Handler
}

func NewStaticHandler(webFS fs.FS) http.Handler {
	return &staticHandler{
		fs:   webFS,
		base: http.FileServer(http.FS(webFS)),
	}
}

func (h *staticHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		h.base.ServeHTTP(w, r)
		return
	}

	requestPath := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
	if requestPath == "." {
		requestPath = ""
	}
	if requestPath == "" || strings.HasSuffix(r.URL.Path, "/") {
		requestPath = path.Join(requestPath, "index.html")
	}

	if shouldServeGzip(r, requestPath) {
		gzipPath := requestPath + ".gz"
		if info, err := fs.Stat(h.fs, gzipPath); err == nil && !info.IsDir() {
			w.Header().Set("Vary", "Accept-Encoding")
			w.Header().Set("Content-Encoding", "gzip")
			if contentType := mime.TypeByExtension(path.Ext(requestPath)); contentType != "" {
				w.Header().Set("Content-Type", contentType)
			}

			gzipReq := r.Clone(r.Context())
			gzipReq.URL = cloneURL(r.URL)
			gzipReq.URL.Path = "/" + gzipPath
			h.base.ServeHTTP(w, gzipReq)
			return
		}
	}

	if strings.Contains(strings.ToLower(r.Header.Get("Accept-Encoding")), "gzip") {
		w.Header().Set("Vary", "Accept-Encoding")
	}
	h.base.ServeHTTP(w, r)
}

func shouldServeGzip(r *http.Request, requestPath string) bool {
	if strings.HasSuffix(requestPath, ".gz") {
		return false
	}
	if r.Header.Get("Range") != "" {
		return false
	}
	for _, token := range strings.Split(strings.ToLower(r.Header.Get("Accept-Encoding")), ",") {
		encoding := strings.TrimSpace(strings.SplitN(token, ";", 2)[0])
		if encoding == "gzip" {
			return true
		}
	}
	return false
}

func cloneURL(src *url.URL) *url.URL {
	dst := *src
	return &dst
}
