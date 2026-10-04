# MCPNet storage

The MCPNet VM is the persistent private storage tier for the 3DS Decomp Lab.

## Bootstrap

When the VM is online:

```bash
sudo bash labs/3ds-decomp/mcpnet/bootstrap.sh
```

Expected root:

```
/srv/3ds-lab
```

The bootstrap creates the Pushmo training workspace and keeps `games/pushmo/original` non-writable to the lab group.

## GitHub Actions probe

The workflow supports a manual `mcpnet-probe` mode after these repository secrets exist:

- `MCPNET_HOST`
- `MCPNET_USER`
- `MCPNET_SSH_KEY`
- `MCPNET_KNOWN_HOSTS`

Use a restricted SSH account/key dedicated to this lab. Do not reuse an administrator key.

## Storage policy

Original and extracted game material stays on MCPNet. GitHub contains only code written for the lab, tooling, documentation, sanitized metadata, and public-safe reports.
