package main

import (
	"context"

	"github.com/wailsapp/wails/v3/pkg/application"
)

type trayApp interface {
	Icon() []byte
	NewSystemTray() trayHandle
	NewMenu() menuHandle
	Quit()
}

type trayHandle interface {
	SetIcon([]byte)
	SetMenu(menuHandle)
}

type menuHandle interface {
	Add(string) menuItemHandle
}

type menuItemHandle interface {
	OnClick(func())
}

type trayWindow interface {
	Show() application.Window
	Focus()
}

type SystemTrayService struct {
	app        *application.App
	mainWindow trayWindow
}

type wailsTrayApp struct {
	app *application.App
}

type wailsTray struct {
	tray *application.SystemTray
}

type wailsMenu struct {
	menu *application.Menu
}

type wailsMenuItem struct {
	item *application.MenuItem
}

func NewSystemTrayService() *SystemTrayService {
	return &SystemTrayService{}
}

func (s *SystemTrayService) ServiceStartup(ctx context.Context, options application.ServiceOptions) error {
	s.app = application.Get()
	if s.app != nil {
		s.configureTray(wailsTrayApp{app: s.app})
	}
	return nil
}

func (s *SystemTrayService) ServiceShutdown() error {
	s.app = nil
	s.mainWindow = nil
	return nil
}

func (s *SystemTrayService) configureTray(app trayApp) {
	systray := app.NewSystemTray()
	systray.SetIcon(app.Icon())

	menu := app.NewMenu()
	systray.SetMenu(menu)

	menu.Add("Show").OnClick(func() {
		if s.mainWindow == nil {
			return
		}

		s.mainWindow.Show()
		s.mainWindow.Focus()
	})

	menu.Add("Quit").OnClick(func() {
		app.Quit()
	})
}

func (a wailsTrayApp) Icon() []byte {
	return a.app.Config().Icon
}

func (a wailsTrayApp) NewSystemTray() trayHandle {
	return wailsTray{tray: a.app.SystemTray.New()}
}

func (a wailsTrayApp) NewMenu() menuHandle {
	return wailsMenu{menu: a.app.NewMenu()}
}

func (a wailsTrayApp) Quit() {
	a.app.Quit()
}

func (t wailsTray) SetIcon(icon []byte) {
	t.tray.SetIcon(icon)
}

func (t wailsTray) SetMenu(menu menuHandle) {
	t.tray.SetMenu(menu.(wailsMenu).menu)
}

func (m wailsMenu) Add(label string) menuItemHandle {
	return wailsMenuItem{item: m.menu.Add(label)}
}

func (m wailsMenuItem) OnClick(callback func()) {
	m.item.OnClick(func(ctx *application.Context) {
		callback()
	})
}
