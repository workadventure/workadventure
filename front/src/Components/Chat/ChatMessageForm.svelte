<script lang="ts">
    import {chatMessagesStore, chatInputFocusStore} from "../../Stores/ChatStore";

    let newMessageText = '';
    
    function onFocus() {
        chatInputFocusStore.set(true);
    }
    function onBlur() {
        chatInputFocusStore.set(false);
    }

    function saveMessage() {
        if (!newMessageText) return;
        chatMessagesStore.addPersonnalMessage(newMessageText);
        newMessageText = '';
    }
</script>

<form on:submit|preventDefault={saveMessage}>
    <input type="text" bind:value={newMessageText} placeholder="Enter your message..." on:focus={onFocus} on:blur={onBlur} >
    <button type="submit">
        <img src="/static/images/send.png" alt="Send" width="20">
    </button>
</form>

<style lang="scss">
    form {
        display: flex;
        padding-left: 4px;
        padding-right: 4px;
      
        input {
          flex: auto;
          background-color: #42464d;
          color: white;
          border-bottom-left-radius: 4px;
          border-top-left-radius: 4px;
          border: none;
          font-size: 22px;
          font-family: Whiteney;
          min-width: 0; //Needed so that the input doesn't overflow the container in firefox
          outline: none;
        }
        
        button {
          background-color: #42464d;
          color: white;
          border-bottom-right-radius: 4px;
          border-top-right-radius: 4px;
          border: none;
          border-left: solid black 1px;
          font-size: 16px;
          font-family: Whiteney;
        }
    }
</style>