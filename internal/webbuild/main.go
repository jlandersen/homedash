package main

import (
	"bytes"
	"compress/gzip"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/evanw/esbuild/pkg/api"
	"github.com/tdewolff/minify/v2"
	"github.com/tdewolff/minify/v2/css"
	"github.com/tdewolff/minify/v2/html"
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

	if err := bundleJS(srcDir, distDir); err != nil {
		log.Fatalf("bundle JS: %v", err)
	}

	m := minify.New()
	m.AddFunc("text/html", html.Minify)
	m.AddFunc("text/css", css.Minify)
	m.AddFunc("image/svg+xml", svg.Minify)

	// JS files are handled by esbuild above; skip them here.
	jsFiles := collectJSFiles(srcDir)

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

		// JS files are already written by esbuild; skip all of them.
		if jsFiles[path] {
			return nil
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

// bundleJS uses esbuild to bundle web/app.js and all its imports into a single
// minified web/dist/app.js, and writes only that output file.
func bundleJS(srcDir, distDir string) error {
	entryPoint := filepath.Join(srcDir, "app.js")

	result := api.Build(api.BuildOptions{
		EntryPoints:       []string{entryPoint},
		Bundle:            true,
		MinifyWhitespace:  true,
		MinifyIdentifiers: true,
		MinifySyntax:      true,
		Target:            api.ES2020,
		Format:            api.FormatESModule,
		Outdir:            distDir,
		Write:             true,
		LogLevel:          api.LogLevelSilent,
	})

	if len(result.Errors) > 0 {
		msgs := make([]string, len(result.Errors))
		for i, e := range result.Errors {
			msgs[i] = e.Text
		}
		return fmt.Errorf("esbuild errors: %s", strings.Join(msgs, "; "))
	}

	// Gzip the bundled output.
	bundledPath := filepath.Join(distDir, "app.js")
	out, err := os.ReadFile(bundledPath)
	if err != nil {
		return fmt.Errorf("read bundled app.js: %w", err)
	}
	return writeGzip(bundledPath+".gz", out)
}

// collectJSFiles returns a set of absolute paths for all .js files under srcDir
// (excluding the dist subdirectory). These are skipped in the main walk since
// esbuild handles them.
func collectJSFiles(srcDir string) map[string]bool {
	set := make(map[string]bool)
	distDir := filepath.Join(srcDir, "dist")
	_ = filepath.WalkDir(srcDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if path == distDir && d.IsDir() {
			return filepath.SkipDir
		}
		if !d.IsDir() && strings.ToLower(filepath.Ext(path)) == ".js" {
			set[path] = true
		}
		return nil
	})
	return set
}

func mediaTypeForExt(ext string) string {
	switch strings.ToLower(ext) {
	case ".html":
		return "text/html"
	case ".css":
		return "text/css"
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
