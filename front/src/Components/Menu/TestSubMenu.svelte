<div class="tw-container tw-bg-darker">
  <h1>
    Basic color & classes tests
  </h1>
  <div class="tw-flex tw-flex-col tw-space-y-1">
    <a href="#" class="btn pop-blue">
      Test btn
    </a>
    <a href="#" class="btn pop-yellow">
      Test btn
    </a>
    <a href="#" class="btn pop-red">
      Test btn
    </a>
    <a href="#" class="btn pop-green">
      Test btn
    </a>
    <p class="tw-text-pop-blue-500">
      Text test
    </p>
    <p class="tw-text-pop-yellow">
      Text test
    </p>
    <p class="tw-text-pop-red">
      Text test
    </p>
    <p class="tw-text-pop-green">
      Text test
    </p>
  </div>
  <h1>
    Form tests
  </h1>
  <form>
    <div>
      <label for="text_input">Text input</label>
      <input type="text" name="text_input" id="text_input" placeholder="a placeholder">
    </div>
    <div>
      <label for="text_input_bis">Text input bis</label>
      <input type="text" name="text_input" id="text_input_bis" value="ladida !">
    </div>
    <div class="tw-toggle-switch">
      <label for="cb_input"><input type="checkbox" id="cb_input" name="cb_input" value="cb_input">A checkbox<span>test</span></label>
    </div>
  </form>
</div>
<script>
  import "../../../style/tailwind.scss";
</script>