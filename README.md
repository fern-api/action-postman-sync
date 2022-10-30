# Postman Sync

This action will update your postman collection on `https://www.postman.com`.

## Usage

```yaml
steps:
  - name: Checkout repo
    uses: actions/checkout@v3

  - name: Update postman collections
    uses: fern-api/action-postman-sync@v1
    with:
      api-key: ${{ secrets.POSTMAN_API_KEY }}
      workspace-id: ${{ secrets.POSTMAN_WORKSPACE_ID }}
      collection-path: path/to/collection.json
```
## Contributing

Remember to run build and package the code before pushing changes. If you forget to do this, CI will fail!

```bash 
npm run build
npm run package
```
