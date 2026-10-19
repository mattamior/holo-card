# All-in-one merge: push and Pages deployment

Date: 2026-10-19

## Push

- Command: `git push --atomic origin feature/classic main`.
- Result: `main` `305944d..dab1555`; `feature/classic` created at `a42d348`.
- Remote refs read back with `git ls-remote`:
  - `refs/heads/main` = `dab155507010363a66f8ca545998541effb755ed`;
  - `refs/heads/feature/classic` = `a42d3488f34d9103f417aeccedf79394e2af9cc7`;
  - `refs/heads/feature/all-in-one` unchanged at `adf07cc`.

## Pages deployment

- Runs from the push: `39224965877` and `39224978596`, both `main` @ `dab1555`, both completed `success`.
- Deployment includes `feature/classic`, so the build resolves `/classic/` from that branch and `/all-in-one/` from `main`.

## Published verification

- `https://mattamior.github.io/holo-card/all-in-one/` → HTTP 200, 232,139 bytes, title "全息闪卡 · Holo Card · 汇总版（全部特效）".
- `https://mattamior.github.io/holo-card/classic/` → HTTP 200, 29,154 bytes, title "全息闪卡 · Holo Card Demo", contains the corner tilt clamp (`Math.hypot` ×2).
- `https://mattamior.github.io/holo-card/` → HTTP 200, version overview renders with 6 routes.
- Version navigation in `/classic/` links to `../all-in-one/`.

## Notes

- `gh` CLI is not installed locally; run status was read from the public GitHub Actions API.
- Live interactive QA (levels, WebGL, pack, mobile) is still outstanding and remains in `.agnir/next-actions.md`.
