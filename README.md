# Jep!

Play Jeopardy! online with your friends at [Jep!][jep]. Choose from past games or make your own. Just share the link to play with friends.

:earth_americas: Play a game: [https://whatis.club][jep]

:newspaper: Read the blog post: [https://clairenord.com/jep.html][blog]

## Development

To run the app locally, first install [Docker][docker].

Next, install the project's local dependencies:

```sh
npm install
```

Start the Supabase project:

```ts
npx supabase start
```

Set environment variables. In particular, set `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from the results of `npx
supabase status`.

```sh
cp .env.example .env
vim .env # add secrets to .env
source .env
```

Afterwards, start the Remix development server like so:

```sh
npm run dev
```

Open up [http://localhost:3000](http://localhost:3000) and you should be ready to go!

## Supabase

View the local Supabase dashboard at
[http://localhost:54323/](http://localhost:54323/).

View mock emails sent for password reset and email verification at
[http://localhost:54324/](http://localhost:54324/).

Link to your own production Supabase project with:

```sh
npx supabase link --project-ref $SUPABASE_PROJECT_REF --password $SUPBABASE_DB_PASSWORD
```

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

[jep]: https://whatis.club
[blog]: https://clairenord.com/jep.html
[docker]: https://www.docker.com/

[^1]: https://supabase.com/docs/guides/cli/local-development#database-migrations
[^2]: https://supabase.com/docs/guides/cli/local-development#deploy-database-changes
