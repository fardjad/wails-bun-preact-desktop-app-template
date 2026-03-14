package main

import (
	"embed"
	"log"
	"net/http"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	backend := NewApp()
	assetsHandler := application.BundledAssetFileServer(assets)

	app := application.New(application.Options{
		Name:        "Desktop Application",
		Description: "A cross-platform desktop application built with Wails, Preact, and TypeScript.",
		Services: []application.Service{
			application.NewService(backend),
		},
		Assets: application.AssetOptions{
			Handler: assetsHandler,
			Middleware: func(next http.Handler) http.Handler {
				return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
					if req.URL.Path == "/wails/custom.js" {
						rw.Header().Set("Content-Type", "application/javascript")
						rw.WriteHeader(http.StatusNoContent)
						return
					}

					next.ServeHTTP(rw, req)
				})
			},
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
		Windows: application.WindowsOptions{
			WebviewUserDataPath:               "",
			WebviewBrowserPath:                "",
		},
		Linux: application.LinuxOptions{
			ProgramName: "desktop-application",
		},
	})

	mainWindow := app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:     "Desktop Application",
		Width:     1024,
		Height:    768,
		MinWidth:  800,
		MinHeight: 600,
		BackgroundColour: application.NewRGB(255, 255, 255),
		URL:               "/",
		Mac: application.MacWindow{
			TitleBar: application.MacTitleBar{
				AppearsTransparent: true,
				HideTitle:          true,
				FullSizeContent:    true,
				UseToolbar:         false,
			},
		},
		Windows: application.WindowsWindow{
			DisableIcon:                         false,
			DisableFramelessWindowDecorations: false,
		},
	})
	backend.configure(app, mainWindow)

	err := app.Run()
	if err != nil {
		log.Fatal(err)
	}
}
