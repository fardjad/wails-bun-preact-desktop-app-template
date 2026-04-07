package main

import (
	"embed"
	"log"
	"net/http"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var icon []byte

func main() {
	databaseService := NewDatabaseService()
	greetService := NewGreetService(databaseService)
	systemService := NewSystemService()
	desktopService := NewDesktopService()
	systemTrayService := NewSystemTrayService()
	assetsHandler := application.BundledAssetFileServer(assets)

	app := application.New(application.Options{
		Name:        appProductName,
		Description: appDescription,
		Icon:        icon,
		Services: []application.Service{
			application.NewService(databaseService),
			application.NewService(greetService),
			application.NewService(systemService),
			application.NewService(desktopService),
			application.NewService(systemTrayService),
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
			WebviewUserDataPath: "",
			WebviewBrowserPath:  "",
		},
		Linux: application.LinuxOptions{
			ProgramName: appProgramName,
		},
	})

	mainWindow := app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:            appProductName,
		Width:            1024,
		Height:           768,
		MinWidth:         800,
		MinHeight:        600,
		BackgroundColour: application.NewRGB(255, 255, 255),
		URL:              "/",
		Mac: application.MacWindow{
			TitleBar: application.MacTitleBar{
				AppearsTransparent: false,
				HideTitle:          false,
				FullSizeContent:    false,
				UseToolbar:         false,
			},
		},
		Windows: application.WindowsWindow{
			DisableIcon:                       false,
			DisableFramelessWindowDecorations: false,
		},
	})
	desktopService.mainWindow = mainWindow
	systemTrayService.mainWindow = mainWindow

	err := app.Run()
	if err != nil {
		log.Fatal(err)
	}
}
