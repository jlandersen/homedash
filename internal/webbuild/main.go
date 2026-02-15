package main

import (
	"bytes"
	"compress/gzip"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/tdewolff/minify/v2"
	"github.com/tdewolff/minify/v2/css"
	"github.com/tdewolff/minify/v2/html"
	"github.com/tdewolff/minify/v2/js"
	"github.com/tdewolff/minify/v2/svg"
)

func main() {
	const (
		srcDir  = "web"
		distDir = "web/dist"
	)

	if err := os.RemoveAll(distDir); err != nil {
		log.Fatalf("remove dist: %v", err)
	}
	if err := os.MkdirAll(distDir, 0o755); err != nil {
		log.Fatalf("create dist: %v", err)
	}

	m := minify.New()
	m.AddFunc("text/html", html.Minify)
	m.AddFunc("text/css", css.Minify)
	m.AddFunc("application/javascript", js.Minify)
	m.AddFunc("image/svg+xml", svg.Minify)

	err := filepath.WalkDir(srcDir, func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if path == distDir {
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		rel, err := filepath.Rel(srcDir, path)
		if err != nil {
			return err
		}
		if rel == "." {
			return nil
		}

		outPath := filepath.Join(distDir, rel)
		if d.IsDir() {
			return os.MkdirAll(outPath, 0o755)
		}

		in, err := os.ReadFile(path)
		if err != nil {
			return err
		}

		out := in
		mediaType := mediaTypeForExt(filepath.Ext(path))
		if mediaType != "" {
			minified, err := m.Bytes(mediaType, in)
			if err != nil {
				return err
			}
			out = minified
		}

		if err := os.WriteFile(outPath, out, 0o644); err != nil {
			return err
		}
		return writeGzip(outPath+".gz", out)
	})
	if err != nil {
		log.Fatalf("build web assets: %v", err)
	}
}

func mediaTypeForExt(ext string) string {
	switch strings.ToLower(ext) {
	case ".html":
		return "text/html"
	case ".css":
		return "text/css"
	case ".js":
		return "application/javascript"
	case ".svg":
		return "image/svg+xml"
	default:
		return ""
	}
}

func writeGzip(path string, data []byte) error {
	var buf bytes.Buffer
	zw, err := gzip.NewWriterLevel(&buf, gzip.BestCompression)
	if err != nil {
		return err
	}
	if _, err := zw.Write(data); err != nil {
		_ = zw.Close()
		return err
	}
	if err := zw.Close(); err != nil {
		return err
	}
	return os.WriteFile(path, buf.Bytes(), 0o644)
}
