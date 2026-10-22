# Deploying

Stack `tetherclan` in `ap-southeast-2`. One Lambda for the API, one S3 bucket holding
both apps, two CloudFront distributions in front of them, and an Aurora cluster that
lives outside the stack.

Written because its absence already cost an afternoon: `template.yaml` referred to this
file before it existed, so the only record of how to deploy was in somebody's head, and
a half-finished upload is indistinguishable from a broken app.

## The addresses

Read them from the stack rather than copying them around — they change if it is rebuilt:

```sh
aws cloudformation describe-stacks --stack-name tetherclan \
  --query 'Stacks[0].Outputs[].{K:OutputKey,V:OutputValue}' --output table
```

| Output | What it is |
|---|---|
| `AppUrl` | the member app |
| `HostUrl` | the host console |
| `ApiFunctionUrl` | the Lambda directly — refuses anything without the origin header |
| `SitesBucketName` | holds both apps: member under `app/`, console under `host/` |
| `AppDistributionId` / `HostDistributionId` | for invalidations |

Both sites and `/api/*` sit behind one shared HTTP basic password, enforced at the edge by
CloudFront Functions. It is a gate for showing people, not authentication — see
`HANDOVER.md` section D.

## Deploying the apps

Both are static. The member app goes to `app/`, the console to `host/`; the
distributions' `OriginPath` is what maps a bare URL onto the right prefix.

```sh
B=$(aws cloudformation describe-stacks --stack-name tetherclan \
      --query 'Stacks[0].Outputs[?OutputKey==`SitesBucketName`].OutputValue' --output text)

(cd frontend && rm -rf dist && npx vite build)
(cd host     && rm -rf dist && npx vite build)

aws s3 sync frontend/dist "s3://$B/app/"
aws s3 sync host/dist     "s3://$B/host/"

aws cloudfront create-invalidation --distribution-id <AppDistributionId>  --paths '/*'
aws cloudfront create-invalidation --distribution-id <HostDistributionId> --paths '/*'
```

Three things that are easy to get wrong, each of which produces a **blank page** rather
than an error:

- **Build, then upload, then invalidate — in that order, every time.** Vite hashes asset
  filenames. An `index.html` that reaches a browser while its assets are missing asks for
  files that do not exist, renders an empty `<div id="root">`, and never recovers. That is
  the signature; there is no error message.
- **No `--delete` on the sync.** Leaving old hashed assets in place costs a few hundred
  kilobytes and means a stale `index.html` in somebody's browser cache still resolves.
  Delete them only when you are sure nobody is holding one.
- **Invalidating clears the edge, not a browser.** Anyone who loaded a broken version
  still has it. Tell them to hard-reload (Cmd+Shift+R) or try an incognito window — and
  check that way yourself before concluding a deploy failed.

`VITE_API_URL` must be empty in production so the apps call `/api/...` on their own
address. `frontend/.env.production` does that explicitly, because `frontend/.env` points
at localhost and Vite applies it to production builds too. `host/` has no env files, so
its production build falls through to the same-origin default. Do not add one.

## Deploying the API

The Lambda runs the compiled backend from a zip in a code bucket. Rebuild, upload, then
point the function at the new object:

```sh
(cd backend && npm run build)      # dist/
# zip dist/ with node_modules for production deps, upload to the code bucket,
# then update the function:
aws lambda update-function-code --function-name <ApiFunction> \
  --s3-bucket <CodeBucket> --s3-key <CodeKey>
```

`CodeBucket` and `CodeKey` are stack parameters, so a deploy that changes the key has to
pass them to `update-stack` as well as to `update-function-code`.

The Lambda reaches Aurora with a short-lived IAM auth token — there is no database
password anywhere. `PAYMENTS_MODE=mock` is set explicitly on the function; set it to
anything else once a real provider is wired and the mock pay endpoint 404s.

## The database

Deliberately not in the template. On the free plan Aurora can only be created as an
*express* cluster, which CloudFormation cannot make:

```sh
aws rds create-db-cluster --db-cluster-identifier tetherclan \
    --engine aurora-postgresql --with-express-configuration
```

It has no VPC and no password. The stack only needs its address and resource id, passed
as the `DbHost` and `DbResourceId` parameters.

## Checking a deploy

```sh
aws s3 ls "s3://$B/host/" --recursive          # index.html AND assets/, same build
aws logs tail /aws/lambda/<ApiFunction> --since 10m --format short
```

The apps keep their bundled mock data and fall back to it whenever the API is
unreachable, so **an app that renders is not proof the API works.** Check the logs, or
watch the network tab. That fallback is why the deployed apps called `localhost:8085` for
a while and looked fine.

## Tearing down

```sh
aws s3 rm "s3://$B" --recursive               # CloudFormation will not delete a full bucket
aws cloudformation delete-stack --stack-name tetherclan
aws rds delete-db-cluster --db-cluster-identifier tetherclan --skip-final-snapshot
```
