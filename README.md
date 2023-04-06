# Jep!

## Development

To run the app locally, make sure the project's local dependencies are
installed:

```sh
npm install
```

Set environment variables:

```sh
cp .env.example .env
vim .env # add secrets to .env
source .env
```

Link supabase project:

```ts
npx supabase init
npx supabase start
npx supabase link --project-ref $SUPABASE_PROJECT_REF --password $SUPABASE_DB_PASSWORD
```

Afterwards, start the Remix development server like so:

```sh
npm run dev
```

Open up [http://localhost:3000](http://localhost:3000) and you should be ready to go!

## Local Supabase

To use a local version of Supabase instead of the production URL, set
`SUPABASE_URL` and `SUPABASE_ANON_KEY` from the results of `npx supabase start`.

View the local Supabase dashboard at
[http://localhost:54323/](http://localhost:54323/).

> **Warning**
>
> Enable Realtime events manually on the `room_events` table for multiplayer
> games to work:
>
> **http://localhost:54323/project/default/database/tables**

### Make a migration[^1]

```sh
npx supabase db diff -f my_migration_name
```

### Deploy a migration[^2]

```sh
npx supabase db push
```

### Generate Typescript types from the database schema:

```sh
npx supabase gen types typescript --linked > app/models/database.types.ts
```

## Tools used

- Web framework: [Remix](https://remix.run/) bootstrapped by
  [create-remix](https://www.npmjs.com/package/create-remix)
- CSS framework: [Tailwind CSS](https://tailwindcss.com/)
- Hosting, deployment: [Vercel](https://vercel.com)
- Database: [Supabase](https://supabase.com/)
- UI components: [Radix UI](https://radix-ui.com/)

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

[^1]: https://supabase.com/docs/guides/cli/local-development#database-migrations
[^2]: https://supabase.com/docs/guides/cli/local-development#deploy-database-changes