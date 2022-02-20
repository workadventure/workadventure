<script lang="ts">
    import { Router, Route } from "svelte-navigator";

    import Sidebar from "./lib/Sidebar.svelte";

    import LazyRoute from "./lib/LazyRoute.svelte";

    const Home = () => import("./views/Home.svelte");
    const AddServer = () => import("./views/AddServer.svelte");

    let insideElectron = window?.WorkAdventureDesktopApi?.desktop;
</script>

{#if insideElectron}
    <Router>
        <Sidebar />
        <main class="flex flex-grow">
            <LazyRoute path="/" component={Home} delayMs={500}>Loading ...</LazyRoute>
            <LazyRoute path="/server/add" component={AddServer} delayMs={500}>Loading ...</LazyRoute>
            <Route>
                <h3>404</h3>
                <p>No Route could be matched.</p>
            </Route>
        </main>
    </Router>
{:else}
    <main class="flex flex-grow justify-center items-center">Please open the app inside of Electron.</main>
{/if}

<style>
    :root {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans",
            "Helvetica Neue", sans-serif;
    }

    main {
        background-color: #30343d;
    }
</style>
