# Build And Release Specification

This document describes what needs to happen for each supported operating
system, architecture, and build mode to produce the outputs we want from this
repository.

The goal here is clarity first: each section spells out the steps, in order, and
what each step is doing.

## Build Strategy

This repo should prefer native builds and native test runs over
cross-compilation.

1. Local development should only target the current machine. Development and
   local testing should work the same way they do on the developer's host OS and
   architecture.

2. CI test jobs should run on whatever target the runner natively supports. Test
   jobs should behave like local development on that runner instead of trying to
   cross-compile or emulate other targets.

3. Release artifacts should be built on platform-specific runners. Windows
   artifacts should be built on Windows runners, Linux artifacts on Linux
   runners, and macOS artifacts on macOS runners.

4. Signing steps should run on the same platform-specific runners that produce
   the release artifacts. That keeps platform tooling, credentials, and
   post-build signing steps close to the artifacts they apply to.

5. Cross-compilation should not be the default workflow. If a target needs a
   native runner to build or package cleanly, the preferred answer is to use
   that native runner.

## Build Metadata Source Of Truth

The source of truth for build metadata is `build/config.yml`.

1. `build/config.yml` should define the canonical build and product metadata.
   Other files should consume those values rather than becoming separate sources
   of truth.

2. Derived values should be generated automatically from the canonical config.
   This includes values such as the project slug, app name variants,
   identifiers, and any build metadata that needs to appear in generated files.

3. Renaming the project should start from `productName`. The rename workflow
   should derive a slug from `productName` and update all other affected
   metadata automatically.

4. Propagation should be scripted and repeatable. If files such as plist files,
   manifests, Go metadata, frontend metadata, or packaging config need synced
   values, there should be one automated sync path rather than manual edits in
   many files.

5. Build and release recipes should read from synced or derived metadata, not
   hardcoded duplicates. This keeps local builds, CI builds, packaging, and
   release steps aligned after a rename or metadata change.

6. The project slug should be derived automatically from `productName` using
   lowercase kebab-case. Renames should be reproducible and should not depend on
   manually editing a separate slug field unless the repo later decides to
   introduce an explicit override.

7. Generated metadata and other generated build files should be committed to
   Git. The repository should stay in a runnable and reviewable state, with
   generated changes visible in diffs.

8. Syncing or renaming should update every place where product metadata is
   consumed directly. At minimum this includes the Go module name, Go app
   metadata constants, frontend app metadata constants, frontend package name,
   HTML document title, and any generated Wails build assets.

9. Syncing or renaming should update frontend references to the generated Wails
   bindings namespace. If the slug changes, imports or paths that point at
   `frontend/bindings/<slug>/...` need to be rewritten automatically.

10. Syncing should regenerate the derived build outputs that depend on the
    canonical metadata. At minimum this includes regenerated Wails build assets,
    regenerated bindings, and any formatted generated source files.

11. Syncing should ensure local prerequisites needed by regeneration are
    present. If generated frontend outputs depend on installed frontend
    packages, the sync path should make sure those dependencies exist before
    regeneration runs.

## Style And Formatting

Style checking and auto-formatting should be automated and should only apply to
files that are not ignored by Git.

1. File discovery should follow Git's tracked and unignored file set. Style and
   formatting commands should only operate on files that are not ignored in
   `.gitignore`.

2. Go files should use Go's native tooling. Formatting should use tools such as
   `gofmt`, and static checks should use tools such as `go vet`.

3. General repo formatting should use `dprint` for the file types it supports.
   This keeps non-Go formatting centralized where `dprint` has coverage.

4. Dockerfiles should use `dockerfmt`. Dockerfile formatting should be handled
   separately from `dprint`.

5. Shell scripts should use `shfmt`. Shell formatting should be handled
   separately from `dprint`, using the selected shell formatting style for the
   repo.

6. There should be one automated check entrypoint: `style-check`. This should
   run all style and lint checks across the supported tools without modifying
   files.

7. There should be one automated fix entrypoint: `style-fix`. This should run
   all supported formatting and auto-fix steps across the supported tools.

8. CI should use the non-mutating check entrypoint. CI should fail when style
   requirements are not met, rather than modifying files in the runner.

9. Local development should use the mutating fix entrypoint. Developers should
   be able to apply the repository's formatting rules with a single command
   before committing.

## Helper Script Standards

Helper scripts for build and development should use the scripting environment
that best matches the target scope, while staying easy to read and maintain.

1. Cross-platform helper scripts should prefer Bun Shell. If a script needs to
   work across Windows, macOS, and Linux, Bun Shell should be the default
   choice.

2. Windows-only helper scripts should use PowerShell or Bun Shell. The choice
   should depend on which option makes the script clearer and easier to
   maintain.

3. macOS-only and Linux-only helper scripts should use Bash or Bun Shell. The
   choice should depend on which option keeps the script simplest and most
   readable.

4. Readability and maintainability should be prioritized over cleverness. The
   preferred implementation is the one that is easiest to understand and safely
   change later.

5. Cross-platform behavior should not be simulated with fragile shell tricks
   when a clearer Bun-based script would do the job. The goal is predictable
   behavior across supported development and CI environments.

## GitHub Actions Workflows

The GitHub Actions setup should be split into a CI workflow and a release
workflow.

### CI workflow

The CI workflow should validate the repository on the native platform of the
runner.

Trigger policy:

- Run on pull requests.
- Run on pushes.
- Allow manual runs.

1. Run style checks. CI should use the automated non-mutating style entrypoint
   and fail if formatting or lint rules are not met.

2. Run the normal build for the runner's native target. The CI build should
   behave like a local native build on that runner.

3. Run tests on the runner's native target. This should cover the same test flow
   developers use locally on that platform.

4. The repository may choose one default native CI platform instead of running a
   multi-platform CI matrix. If that happens, CI should stay native on that one
   runner and broader platform verification should remain in the release jobs.

### Release workflow

The release workflow should only publish artifacts when CI has already succeeded
and the version in `build/config.yml` has changed.

Trigger policy:

- Run after the `CI` workflow completes successfully on `main`.
- Allow manual runs.

1. Gate the release workflow on successful CI. Releases should only be created
   from code that already passed the CI workflow.

2. The release workflow should build the exact commit SHA that the successful
   `CI` run validated. It should not drift to a newer `main` commit that landed
   after the CI run completed.

3. Read the version from `build/config.yml`. This file is the source of truth
   for release versioning.

4. Compare the current version with the latest released version. A release
   should only be created when the version in `build/config.yml` changes. A
   practical way to do this is to compare the current version against the most
   recent release tag. Release tags should use the `v1.2.3` format.

5. Run target-specific native jobs for each release target. Each job should run
   on the native runner for that target and produce that target's final release
   artifact. The spec should pin unusual arm64 runner labels explicitly, while
   common targets can continue to use the standard native runner labels. For
   macOS, prefer `macos-latest` and allow that current arm64 runner to build
   both the `amd64` and `arm64` binaries before packaging the universal app on
   the same runner.

6. Run target-specific tests in the release jobs before producing the final
   artifact. Release jobs should verify the target in the same native
   environment used to build and package it.

7. Upload each target artifact from its platform-specific job. Release jobs
   should use uploaded artifacts as the handoff to the final publishing job.

8. Create the GitHub release only after all target jobs succeed. The release
   creation step should collect all uploaded artifacts and attach them to the
   release. Partial releases are not desired; if any required target fails, the
   release should fail.

9. Attach checksums for the published artifacts. Release jobs should produce
   SHA256 checksum files alongside the main assets.

10. Run optional signing steps inside the platform-specific jobs before
    uploading artifacts. If signing is enabled later, it should happen on the
    same native runner that built the corresponding artifact.

11. Auto-generate GitHub release notes. The final publishing step should rely on
    generated release notes rather than requiring a manual changelog step.

## Shared Concepts

These steps are reused across most targets:

1. Install frontend dependencies. This makes sure `frontend/node_modules` exists
   so frontend builds and tests can run.

2. Install Go dependencies. This makes sure the Go module graph is up to date
   before generating bindings or compiling.

3. Generate Wails bindings. The frontend imports generated bindings, so this
   must happen before frontend builds and frontend tests.

4. Dev-mode binding regeneration should avoid leaving the frontend with missing
   or partially-written generated files. If bindings are regenerated while the
   frontend dev server is watching them, the safer approach is to generate into
   a temporary directory first and then swap the finished files into place.

5. Linux AppImage packaging should stage the binary, icon, and desktop file in
   the AppImage working directory and invoke the AppImage generator with
   relative filenames from that directory. Passing absolute staged paths can
   cause the generator to embed broken nested paths under `usr/bin`.

6. Build the frontend bundle when producing packaged binaries or app bundles.
   This creates `frontend/dist`, which is embedded into the Go app.

7. Ensure `frontend/dist` exists before Go tests or checks. Go code embeds
   `frontend/dist`, so even non-release Go commands need at least a placeholder
   output directory.

8. Apply build-mode-specific Go flags. Dev builds should keep debug-friendly
   settings. Release builds should use production tags and strip symbols where
   appropriate.

## Build Modes

### Dev

1. Use debug-friendly Go flags. This should avoid stripping symbols and should
   disable optimizations that make local debugging harder.

2. Produce an output that can be run locally on the target platform. For macOS
   and Linux this is a native executable. For Windows this is a native `.exe`.

3. When running through Wails dev mode, start the frontend dev server instead of
   embedding a production bundle. This is the fast inner-loop workflow.

### Release

1. Build the production frontend bundle. This creates the assets that get
   embedded into the final app.

2. Build with production Go flags. This should include the `production` tag,
   `-trimpath`, and release `ldflags`.

3. Package the result into the desired target-specific release artifact. On
   Windows this is a raw `.exe`. On Linux this is a raw `.AppImage`. On macOS
   this is a zipped `.app`, and for universal macOS a lipo-combined binary
   inside the bundle.

4. Name release artifacts consistently. The artifact naming pattern should be
   `<slug>-<os>-<arch>-<version>` with the target-appropriate extension such as
   `.exe`, `.AppImage`, or `.app.zip`.

## Dev Mode Output

This section describes what is needed to run the app in development mode on each
host OS.

### Windows dev mode

1. Install frontend dependencies. Needed for the frontend dev server and tests.

2. Generate Wails bindings. The frontend expects generated bindings during
   development too.

3. Regenerate bindings without deleting the watched bindings directory in place.
   Dev-mode Go rebuilds can race with the frontend watcher if bindings are
   removed before the replacement files are ready.

4. Start Wails dev mode. This runs the Go backend together with the frontend dev
   server.

5. Use Windows-native execution. Any command wrappers must work in PowerShell or
   via Bun on Windows.

### Linux dev mode

1. Install frontend dependencies. Needed for the frontend dev server and tests.

2. Generate Wails bindings. The frontend expects generated bindings during
   development too.

3. Regenerate bindings without deleting the watched bindings directory in place.
   Dev-mode Go rebuilds can race with the frontend watcher if bindings are
   removed before the replacement files are ready.

4. Start Wails dev mode. This runs the Go backend together with the frontend dev
   server.

5. Make sure Linux GUI dependencies are installed. Wails on Linux needs
   GTK/WebKit development packages to build and run native app code.

### macOS dev mode

1. Install frontend dependencies. Needed for the frontend dev server and tests.

2. Generate Wails bindings. The frontend expects generated bindings during
   development too.

3. Regenerate bindings without deleting the watched bindings directory in place.
   Dev-mode Go rebuilds can race with the frontend watcher if bindings are
   removed before the replacement files are ready.

4. Start Wails dev mode. This runs the Go backend together with the frontend dev
   server.

5. Apply the configured macOS deployment target to Go builds. macOS builds need
   a consistent minimum target in `MACOSX_DEPLOYMENT_TARGET`, `CGO_CFLAGS`, and
   `CGO_LDFLAGS`.

## Test Runs

This section describes what is needed to run tests on each host OS.

### Windows tests

1. Install frontend dependencies. Frontend tests depend on Bun packages.

2. Generate Wails bindings. Frontend test code imports generated bindings.

3. Ensure `frontend/dist` exists before Go tests. Go embed paths must exist even
   when the frontend production build is not being run.

4. Run frontend tests. This validates the frontend code in Bun.

5. Run Go tests. This validates the backend and shared Go code on Windows.

### Linux tests

1. Install frontend dependencies. Frontend tests depend on Bun packages.

2. Generate Wails bindings. Frontend test code imports generated bindings.

3. Ensure `frontend/dist` exists before Go tests. Go embed paths must exist even
   when the frontend production build is not being run.

4. Install Linux GUI dependencies if native Wails packages are touched by the
   test build. GTK/WebKit headers are needed when Go compiles code that links
   against Linux desktop libraries.

5. Run frontend tests. This validates the frontend code in Bun.

6. Run Go tests. This validates the backend and shared Go code on Linux.

### macOS tests

1. Install frontend dependencies. Frontend tests depend on Bun packages.

2. Generate Wails bindings. Frontend test code imports generated bindings.

3. Ensure `frontend/dist` exists before Go tests. Go embed paths must exist even
   when the frontend production build is not being run.

4. Apply the configured macOS deployment target to Go tests if CGO is involved.
   This keeps test compilation aligned with actual macOS build settings.

5. Run frontend tests. This validates the frontend code in Bun.

6. Run Go tests. This validates the backend and shared Go code on macOS.

## Windows Release Binaries

Desired outputs:

- `windows/amd64`: release `.exe`
- `windows/arm64`: release `.exe`

### Windows amd64 release binary

1. Install frontend dependencies. Required for the production frontend build.

2. Generate Wails bindings with release flags. Keeps generated bindings aligned
   with the release build configuration.

3. Build the production frontend bundle. Produces the files that will be
   embedded into the executable.

4. Generate icons. Produces Windows icon assets used by the executable metadata.

5. Generate the Windows `.syso` file for `amd64`. This injects Windows resources
   such as icons and manifest data into the final executable.

6. Run `go build` for `GOOS=windows` and `GOARCH=amd64` in release mode. This
   produces the Windows amd64 executable with production flags and Windows GUI
   linker flags.

7. Remove temporary `.syso` files if they are only build artifacts. Keeps the
   workspace clean and avoids cross-target contamination.

8. Optionally sign the final executable after it is built. This requires a
   Windows code-signing certificate, secure storage for the certificate
   password, and a signing step that runs on the finished `.exe`.

9. Name the artifact using the standard release pattern. The Windows amd64
   release asset should follow `<slug>-windows-amd64-<version>.exe`.

### Windows arm64 release binary

1. Install frontend dependencies. Required for the production frontend build.

2. Generate Wails bindings with release flags. Keeps generated bindings aligned
   with the release build configuration.

3. Build the production frontend bundle. Produces the files that will be
   embedded into the executable.

4. Generate icons. Produces Windows icon assets used by the executable metadata.

5. Generate the Windows `.syso` file for `arm64`. This injects Windows resources
   such as icons and manifest data into the final executable.

6. Run `go build` for `GOOS=windows` and `GOARCH=arm64` in release mode. This
   produces the Windows arm64 executable with production flags and Windows GUI
   linker flags.

7. Remove temporary `.syso` files if they are only build artifacts. Keeps the
   workspace clean and avoids cross-target contamination.

8. Optionally sign the final executable after it is built. This requires a
   Windows code-signing certificate, secure storage for the certificate
   password, and a signing step that runs on the finished `.exe`.

9. Name the artifact using the standard release pattern. The Windows arm64
   release asset should follow `<slug>-windows-arm64-<version>.exe`.

## Linux AppImages

Linux release packaging in this repo should produce AppImages. The AppImage
packaging configuration lives under `build/linux/appimage/`, the application
icon source is `build/appicon.png`, and the AppImage packaging step is
`wails3 task linux:create:appimage`. Because Linux desktop builds use CGO,
native `amd64` and native `arm64` Linux runners are the cleanest fit for
producing those artifacts.

Desired outputs:

- `linux/amd64`: `.AppImage`
- `linux/arm64`: `.AppImage`

### Linux amd64 AppImage

1. Install frontend dependencies. Required for the production frontend build
   that will be embedded into the packaged app.

2. Generate Wails bindings with release flags. Keeps generated bindings aligned
   with the release configuration used for packaging.

3. Build the production frontend bundle. Produces the files that will be
   embedded into the Linux application.

4. Install Linux native desktop build dependencies. Wails packaging on Linux
   needs the C toolchain plus GTK/WebKit development libraries available.

5. Build the Linux amd64 app in release mode. The AppImage package step needs a
   release-ready Linux executable and app metadata.

6. Make sure AppImage packaging assets exist in `build/linux/appimage/`. Wails
   reads AppImage-specific packaging config from that directory.

7. Run the Wails AppImage packaging task. This produces the final AppImage
   artifact.

8. Mark the resulting AppImage executable if needed. AppImages may need
   `chmod +x <name>.AppImage` before direct execution.

9. Validate Linux runtime dependencies if startup fails. Linux desktop runtime
   issues can still come from missing WebKit runtime packages such as
   `libwebkit2gtk-4.1-0` on Debian/Ubuntu systems.

10. Name the artifact using the standard release pattern. The Linux amd64
    release asset should follow `<slug>-linux-amd64-<version>.AppImage`.

### Linux arm64 AppImage

1. Install frontend dependencies. Required for the production frontend build
   that will be embedded into the packaged app.

2. Generate Wails bindings with release flags. Keeps generated bindings aligned
   with the release configuration used for packaging.

3. Build the production frontend bundle. Produces the files that will be
   embedded into the Linux application.

4. Install Linux native desktop build dependencies. Wails packaging on Linux
   needs the C toolchain plus GTK/WebKit development libraries available.

5. Build the Linux arm64 app in release mode on a native arm64 Linux runner.
   Native arm64 is the cleaner path for this repo because Linux desktop
   packaging depends on CGO-linked native libraries.

6. Make sure AppImage packaging assets exist in `build/linux/appimage/`. Wails
   reads AppImage-specific packaging config from that directory.

7. Run the Wails AppImage packaging task. This produces the final AppImage
   artifact.

8. Mark the resulting AppImage executable if needed. AppImages may need
   `chmod +x <name>.AppImage` before direct execution.

9. Be aware of strip compatibility behavior on newer Linux systems. Some newer
   Linux environments may force packaging tools to skip stripping, which can
   lead to larger AppImages.

10. Name the artifact using the standard release pattern. The Linux arm64
    release asset should follow `<slug>-linux-arm64-<version>.AppImage`.

## macOS Release App Bundles

Desired outputs:

- `macos/amd64`: `.app.zip`
- `macos/arm64`: `.app.zip`
- `macos/universal`: `.app.zip`

### macOS amd64 release app bundle

1. Install frontend dependencies. Required for the production frontend build.

2. Generate Wails bindings with release flags. Keeps generated bindings aligned
   with the release build configuration.

3. Build the production frontend bundle. Produces the files that will be
   embedded into the executable.

4. Generate icons. Produces the macOS icon assets used in the app bundle.

5. Run `go build` for `GOOS=darwin` and `GOARCH=amd64` in release mode. This
   produces the macOS amd64 executable with the configured deployment target.

6. Create the `.app` bundle structure. This creates `Contents`, `MacOS`, and
   `Resources`, and copies in the binary, plist, and icon assets.

7. Optionally ad-hoc sign the bundle when building on macOS. This is useful for
   local testing, but it is not the same as distribution signing.

8. Optionally perform distribution signing on the finished `.app`. This requires
   an Apple Developer account, a `Developer ID Application` signing identity, a
   configured entitlements file, and a signing step that runs on the completed
   app bundle.

9. Optionally notarize the signed `.app` for public distribution. This requires
   notarization credentials such as Apple ID, team ID, app-specific password,
   and the follow-up notarization and stapling steps.

10. Zip the final `.app` for release upload. The macOS release asset should be
    the zipped app bundle rather than the raw `.app` directory.

11. Name the artifact using the standard release pattern. The macOS amd64
    release asset should follow `<slug>-macos-amd64-<version>.app.zip`.

### macOS arm64 release app bundle

1. Install frontend dependencies. Required for the production frontend build.

2. Generate Wails bindings with release flags. Keeps generated bindings aligned
   with the release build configuration.

3. Build the production frontend bundle. Produces the files that will be
   embedded into the executable.

4. Generate icons. Produces the macOS icon assets used in the app bundle.

5. Run `go build` for `GOOS=darwin` and `GOARCH=arm64` in release mode. This
   produces the macOS arm64 executable with the configured deployment target.

6. Create the `.app` bundle structure. This creates `Contents`, `MacOS`, and
   `Resources`, and copies in the binary, plist, and icon assets.

7. Optionally ad-hoc sign the bundle when building on macOS. This is useful for
   local testing, but it is not the same as distribution signing.

8. Optionally perform distribution signing on the finished `.app`. This requires
   an Apple Developer account, a `Developer ID Application` signing identity, a
   configured entitlements file, and a signing step that runs on the completed
   app bundle.

9. Optionally notarize the signed `.app` for public distribution. This requires
   notarization credentials such as Apple ID, team ID, app-specific password,
   and the follow-up notarization and stapling steps.

10. Zip the final `.app` for release upload. The macOS release asset should be
    the zipped app bundle rather than the raw `.app` directory.

11. Name the artifact using the standard release pattern. The macOS arm64
    release asset should follow `<slug>-macos-arm64-<version>.app.zip`.

### macOS universal release app bundle

1. Build the macOS amd64 release binary. This provides one side of the universal
   pair.

2. Build the macOS arm64 release binary. This provides the other side of the
   universal pair.

3. Combine the two binaries with `lipo`. This creates one universal executable
   containing both architectures.

4. Create the `.app` bundle structure around the universal binary. This produces
   the final universal macOS app bundle.

5. Optionally ad-hoc sign the bundle when building on macOS. This is useful for
   local testing, but it is not the same as distribution signing.

6. Optionally perform distribution signing on the finished `.app`. This requires
   an Apple Developer account, a `Developer ID Application` signing identity, a
   configured entitlements file, and a signing step that runs on the completed
   app bundle.

7. Optionally notarize the signed `.app` for public distribution. This requires
   notarization credentials such as Apple ID, team ID, app-specific password,
   and the follow-up notarization and stapling steps.

8. Zip the final `.app` for release upload. The macOS release asset should be
   the zipped app bundle rather than the raw `.app` directory.

9. Name the artifact using the standard release pattern. The macOS universal
   release asset should follow `<slug>-macos-universal-<version>.app.zip`.

## Dev Builds by Target

These are the target-specific dev-mode compile steps for local native binaries.

### Windows amd64 dev build

1. Optionally build the frontend bundle if this path is meant to run without
   Wails dev mode. A pure native dev binary still needs embedded frontend
   assets.

2. Generate the Windows `.syso` file for `amd64`. Keeps executable resources
   present in dev binaries too.

3. Run `go build` for `GOOS=windows` and `GOARCH=amd64` with dev flags. This
   creates a Windows amd64 dev executable.

### Windows arm64 dev build

1. Optionally build the frontend bundle if this path is meant to run without
   Wails dev mode. A pure native dev binary still needs embedded frontend
   assets.

2. Generate the Windows `.syso` file for `arm64`. Keeps executable resources
   present in dev binaries too.

3. Run `go build` for `GOOS=windows` and `GOARCH=arm64` with dev flags. This
   creates a Windows arm64 dev executable.

### Linux amd64 dev build

1. Optionally build the frontend bundle if this path is meant to run without
   Wails dev mode. A pure native dev binary still needs embedded frontend
   assets.

2. Run `go build` for `GOOS=linux` and `GOARCH=amd64` with dev flags. This
   creates a Linux amd64 dev binary.

### Linux arm64 dev build

1. Optionally build the frontend bundle if this path is meant to run without
   Wails dev mode. A pure native dev binary still needs embedded frontend
   assets.

2. Run `go build` for `GOOS=linux` and `GOARCH=arm64` with dev flags. This
   creates a Linux arm64 dev binary.

### macOS amd64 dev build

1. Optionally build the frontend bundle if this path is meant to run without
   Wails dev mode. A pure native dev binary still needs embedded frontend
   assets.

2. Generate icons if the dev binary is going to be wrapped in a dev `.app`. This
   keeps the local app bundle representative of the release bundle.

3. Run `go build` for `GOOS=darwin` and `GOARCH=amd64` with dev flags and the
   configured deployment target. This creates a macOS amd64 dev executable.

4. If desired, wrap it in a temporary dev `.app`. This makes local launching
   closer to the final macOS app experience.

### macOS arm64 dev build

1. Optionally build the frontend bundle if this path is meant to run without
   Wails dev mode. A pure native dev binary still needs embedded frontend
   assets.

2. Generate icons if the dev binary is going to be wrapped in a dev `.app`. This
   keeps the local app bundle representative of the release bundle.

3. Run `go build` for `GOOS=darwin` and `GOARCH=arm64` with dev flags and the
   configured deployment target. This creates a macOS arm64 dev executable.

4. If desired, wrap it in a temporary dev `.app`. This makes local launching
   closer to the final macOS app experience.
