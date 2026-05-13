package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"

	"github.com/bifrost/backend/internal/ai"
	"github.com/bifrost/backend/internal/handler"
)

func main() {
	_ = godotenv.Load()

	proxyKey := os.Getenv("AI_VERCEL_PROXY_KEY")
	if proxyKey == "" {
		log.Fatal("AI_VERCEL_PROXY_KEY is required")
	}
	proxyURL := os.Getenv("AI_VERCEL_PROXY_URL")

	allowedOrigins := []string{"http://localhost:3000"}
	if raw := os.Getenv("ALLOWED_ORIGINS"); raw != "" {
		for _, o := range strings.Split(raw, ",") {
			o = strings.TrimSpace(o)
			if o != "" {
				allowedOrigins = append(allowedOrigins, o)
			}
		}
	}

	extractor := ai.NewExtractor(proxyKey, proxyURL)
	h := handler.NewExtractHandler(extractor)

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: allowedOrigins,
		AllowedMethods: []string{"POST", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type"},
	}))

	r.Post("/extract", h.Extract)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("BiFrost extraction service on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
