# Jep!

Play Jeopardy! online with your friends at [Jep!][jep]. Choose from past games or make your own. Just share the link to play with friends.

:earth_americas: Play a game: [https://whatis.club][jep]

:newspaper: Read the blog post: [https://clairenord.com/jep.html][blog]

## Development

To run the app locally, first install [Docker][docker].

Next, run the project setup script to install its locked dependencies:

```sh
./scripts/setup.sh
```

Start the Supabase project:

```sh
npm run db:start
```

Set environment variables. In particular, set `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from the results of `npx
supabase status`, and replace `SESSION_SECRET` with a long random value.

```sh
vim .env.local
npm exec -- varlock load
```

Afterwards, start the development server like so:

```sh
npm run dev
```

Open up [http://localhost:3000](http://localhost:3000) and you should be ready to go!

If Docker was stopped while Supabase was running, the CLI may report that the
project is already running even though its containers are exited. Recover the
local stack without deleting its data with:

```sh
npm run db:restart
```

### Conductor

The shared [Conductor configuration](.conductor/settings.toml) installs locked
dependencies when a workspace is created. On Linux, setup accepts any running
Docker-compatible runtime and can bootstrap Docker in `dnf`-based sandboxes;
other environments are expected to provide their own runtime.

Local worktrees share one Docker stack with fixed ports. Cloud workspaces run
their own stack.

## Supabase

View the local Supabase dashboard at
[http://localhost:54323/](http://localhost:54323/).

View mock emails sent for password reset and email verification at
[http://localhost:54324/](http://localhost:54324/).

Link to your own production Supabase project with:

```sh
npm run db:link
```

### Make a migration[^1]

```sh
npm run db:migration:new -- my_migration_name
```

### Deploy a migration[^2]

```sh
npm run db:push
```

### Generate Typescript types from the database schema:

```sh
npm run db:types
```

## Tools used

- Web framework: [React Router v7](https://reactrouter.com/)
- CSS framework: [Tailwind CSS](https://tailwindcss.com/)
- Hosting, deployment: [Vercel](https://vercel.com)
- Database: [Supabase](https://supabase.com/)
- UI components: [Radix UI](https://radix-ui.com/)
- Environment validation: [Varlock][varlock]

## Thanks

- [Making a Basic React + Firebase
  App](https://paper.dropbox.com/doc/Making-a-Basic-React-Firebase-App--Bys208PiI1n34J9lnkc7lzRxAg-oepkAUyjqbd7Ts0hIB8U4)
  by [jynnie](https://github.com/jynnie)
- [jeopardy-remixable-app on Glitch](https://jeopardy-remixable-app.glitch.me)
  ([source](https://glitch.com/~jeopardy-remixable-app))
- [jarchive-json on Glitch](https://jarchive-json.glitch.me)
  ([source](https://glitch.com/~jarchive-json))
- [Cluebase](https://cluebase.readthedocs.io/en/latest/)
  ([API](cluebase.lukelav.in/), [source](https://github.com/lukelavin/cluebase))

## License

[MIT](https://github.com/cmnord/jep/blob/main/LICENSE) ©
[cmnord](https://github.com/cmnord/)

[jep]: https://whatis.club
[blog]: https://clairenord.com/jep.html
[docker]: https://www.docker.com/
[varlock]: https://varlock.dev/

[^1]: https://supabase.com/docs/guides/cli/local-development#database-migrations

[^2]: https://supabase.com/docs/guides/cli/local-development#deploy-database-changes
