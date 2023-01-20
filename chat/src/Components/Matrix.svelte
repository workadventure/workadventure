<script lang="ts">
    import {EmojiMappingArray, MappingArray, Matrix, NumberMappingArray} from "../Matrix";
    import {MatrixError} from "matrix-js-sdk";
    import {IKeyBackupCheck} from "../Type/Matrix";
    import {onMount} from "svelte";
    import {doc} from "prettier";

    let element: HTMLDivElement;
    let list: HTMLDivElement;
    let loginDiv: HTMLDivElement;

    let username: string;
    let password: string;

    let error: string;

    const matrix = new Matrix();

    onMount(() => {
        if(matrix.backupSession()){
            element.innerText = 'SDK is trying to back-up the last session ...';
            loginDiv.remove();
            try {
                start();
            } catch(e: unknown){
                if(e instanceof MatrixError){
                    error = e.data.error;
                }
            }
        }
    })

    async function login(event) {
        event.preventDefault();
        error = '';
        try {
            await matrix.login(username, password);
            start();
        } catch(e: unknown){
            if(e instanceof MatrixError){
                error = e.data.error;
            }
        }
    }

    async function register(event) {
        event.preventDefault();
        error = '';
        try {
            await matrix.register(username, password);
            start();
        } catch(e: unknown){
            if(e instanceof MatrixError){
                error = e.data.error;
            }
        }
    }

    function start(){
        matrix.start()
            .then(async () => {
                element.innerText = 'SDK is working';
                displayLogout();
                loginDiv.remove();
                if(!await matrix.crossSign()) {
                    await verify();
                }
                const button = document.createElement('button');
                button.innerText = "Create room";
                button.addEventListener('click', async () => {
                    await matrix.createE2EERoom();
                });
                list.appendChild(button);
                const button2 = document.createElement('button');
                button2.innerText = "Send message";
                button2.addEventListener('click', async () => {
                    await matrix.sendMessage();
                });
                list.appendChild(button2);
                return;

                const keyBackupCheckRaw = await matrix.client.checkKeyBackup();
                console.warn(keyBackupCheckRaw);
                const keyBackupCheck = IKeyBackupCheck.parse(keyBackupCheckRaw);
                if(!keyBackupCheck.backupInfo){
                    //await verify();
                    console.warn("No backup info");
                    const keyBackupVersion = await matrix.client.prepareKeyBackupVersion("maPassphrase");
                    const keyBackup = await matrix.client.createKeyBackupVersion(keyBackupVersion);
                    console.log(matrix.client.getKeyBackupEnabled());
                    await matrix.keyVerification();
                    //const keys = await matrix.client.downloadKeys(matrix.client.store.getUsers().map(user => user.userId), true);
                } else {
                    console.warn("Backup defined");
                }

                //await matrix.createE2EERoom();
                //await matrix.verifyDevice();

                //await matrix.crossSign();

            })
            .catch((e) => {
                console.error(e);
                element.innerText = 'SDK error';
                //localStorage.removeItem('mx_user_id');
                //localStorage.removeItem('mx_access_token');
                //localStorage.removeItem('mx_device_id');
                //location.reload();
                displayLogout();
            });
    }

    function displayLogout(){
        const disconnect = document.createElement('button');
        disconnect.innerText = "Disconnect";
        disconnect.addEventListener('click', async () => {
            await matrix.client.logout();
            await matrix.client.clearStores();
            localStorage.removeItem('mx_user_id');
            localStorage.removeItem('mx_access_token');
            localStorage.removeItem('mx_device_id');
            location.reload();
        });
        element.appendChild(disconnect);
    }

    async function verify() {
        const sas = await matrix.verify();
        console.warn("verify =>", sas);
        if (sas) {
            const mappingArray = MappingArray.parse(sas.sas.emoji || sas.sas.decimal);
            if (EmojiMappingArray.safeParse(mappingArray).success) {
                mappingArray.forEach(char => {
                    const element = document.createElement('div');
                    const emoji = document.createElement('div');
                    emoji.innerText = char[0];
                    const name = document.createElement('p');
                    name.innerText = char[1];
                    element.appendChild(emoji);
                    element.appendChild(name);
                    list.appendChild(element);
                });
            } else if (NumberMappingArray.safeParse(mappingArray).success) {
                mappingArray.forEach(char => {
                    const element = document.createElement('div');
                    element.innerText = char;
                    list.appendChild(element);
                });
            }
            const confirm = document.createElement('button');
            confirm.innerText = 'Confirm';
            confirm.addEventListener('click', () => {
                console.warn("SAS confirm => send");
                sas.confirm().then(() => list.innerHTML = '').catch(e => { list.innerHTML = ''; console.error(e) });
            });
            list.appendChild(confirm);
            const cancel = document.createElement('button');
            cancel.innerText = 'Cancel';
            cancel.addEventListener('click', () => sas.cancel());
            list.appendChild(cancel);
        }
    }
</script>

<div id="main" bind:this={loginDiv}>
    <form>
        <input type="text" placeholder="Username" bind:value={username}/>
        <input type="password" placeholder="Password" bind:value={password}/>
        <input type="submit" value="Login" on:click={login}/>
        <input type="submit" value="Register" on:click={register}/>
    </form>
    {#if error}
        <div>
            {error}
        </div>
    {/if}
</div>

<div id="result" bind:this={element}>
    Waiting auth ...
</div>
<div bind:this={list}>
</div>
