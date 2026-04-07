package main

import (
	"bytes"
	"testing"

	"github.com/wailsapp/wails/v3/pkg/application"
)

type fakeTrayApp struct {
	icon       []byte
	tray       *fakeTrayHandle
	menu       *fakeMenuHandle
	quitCalled bool
}

type fakeTrayHandle struct {
	icon []byte
	menu menuHandle
}

type fakeMenuHandle struct {
	items map[string]*fakeMenuItemHandle
}

type fakeMenuItemHandle struct {
	onClick func()
}

type fakeTrayWindow struct {
	actions []string
}

func newFakeTrayApp(icon []byte) *fakeTrayApp {
	return &fakeTrayApp{
		icon: icon,
		tray: &fakeTrayHandle{},
		menu: &fakeMenuHandle{
			items: map[string]*fakeMenuItemHandle{},
		},
	}
}

func (a *fakeTrayApp) Icon() []byte {
	return a.icon
}

func (a *fakeTrayApp) NewSystemTray() trayHandle {
	return a.tray
}

func (a *fakeTrayApp) NewMenu() menuHandle {
	return a.menu
}

func (a *fakeTrayApp) Quit() {
	a.quitCalled = true
}

func (t *fakeTrayHandle) SetIcon(icon []byte) {
	t.icon = icon
}

func (t *fakeTrayHandle) SetMenu(menu menuHandle) {
	t.menu = menu
}

func (m *fakeMenuHandle) Add(label string) menuItemHandle {
	item := &fakeMenuItemHandle{}
	m.items[label] = item
	return item
}

func (m *fakeMenuItemHandle) OnClick(callback func()) {
	m.onClick = callback
}

func (w *fakeTrayWindow) Show() application.Window {
	w.actions = append(w.actions, "show")
	return nil
}

func (w *fakeTrayWindow) Focus() {
	w.actions = append(w.actions, "focus")
}

func TestNewSystemTrayService(t *testing.T) {
	service := NewSystemTrayService()
	if service == nil {
		t.Fatal("NewSystemTrayService() returned nil")
	}
	if service.app != nil {
		t.Error("expected application reference to be nil before startup")
	}
	if service.mainWindow != nil {
		t.Error("expected mainWindow to be nil before startup")
	}
}

func TestSystemTrayServiceShutdownClearsReferences(t *testing.T) {
	service := NewSystemTrayService()
	service.app = &application.App{}

	if err := service.ServiceShutdown(); err != nil {
		t.Fatalf("ServiceShutdown() error = %v, want nil", err)
	}
	if service.app != nil {
		t.Error("expected application reference to be nil after shutdown")
	}
	if service.mainWindow != nil {
		t.Error("expected mainWindow to be nil after shutdown")
	}
}

func TestConfigureTraySetsIconAndMenu(t *testing.T) {
	service := NewSystemTrayService()
	app := newFakeTrayApp([]byte("tray-icon"))

	service.configureTray(app)

	if !bytes.Equal(app.tray.icon, app.icon) {
		t.Fatalf("tray icon = %q, want %q", app.tray.icon, app.icon)
	}
	if app.tray.menu != app.menu {
		t.Fatal("expected tray menu to be attached")
	}
	if app.menu.items["Show"] == nil {
		t.Fatal("expected Show menu item to be added")
	}
	if app.menu.items["Quit"] == nil {
		t.Fatal("expected Quit menu item to be added")
	}
}

func TestConfigureTrayShowDoesNothingWithoutWindow(t *testing.T) {
	service := NewSystemTrayService()
	app := newFakeTrayApp([]byte("tray-icon"))

	service.configureTray(app)
	app.menu.items["Show"].onClick()

	if service.mainWindow != nil {
		t.Fatal("expected no window to be configured in test")
	}
}

func TestConfigureTrayShowShowsAndFocusesWindow(t *testing.T) {
	service := NewSystemTrayService()
	service.mainWindow = &fakeTrayWindow{}
	app := newFakeTrayApp([]byte("tray-icon"))

	service.configureTray(app)
	app.menu.items["Show"].onClick()

	window := service.mainWindow.(*fakeTrayWindow)
	if len(window.actions) != 2 {
		t.Fatalf("window actions = %v, want [show focus]", window.actions)
	}
	if window.actions[0] != "show" || window.actions[1] != "focus" {
		t.Fatalf("window actions = %v, want [show focus]", window.actions)
	}
}

func TestConfigureTrayQuitCallsAppQuit(t *testing.T) {
	service := NewSystemTrayService()
	app := newFakeTrayApp([]byte("tray-icon"))

	service.configureTray(app)
	app.menu.items["Quit"].onClick()

	if !app.quitCalled {
		t.Fatal("expected Quit menu item to quit the app")
	}
}
