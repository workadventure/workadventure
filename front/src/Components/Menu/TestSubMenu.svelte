<div class="tw-container tw-bg-dark-purple">

  <h2 class="tw-justify-start">
    Audio, video & graphics
  </h2>
  <form class="tw-flex tw-flex-col">
    <div class="tw-flex form-select tw-w-full">
      <label for="select_input" class="subtitle">Select input</label>
      <select name="select_input" id="select_input" class="tw-rounded-full tw-w-5/6">
        <option value="1">Option 1</option>
        <option value="2">Option 2</option>
        <option value="3">Option 3</option>
        <option value="4">Option 4</option>
      </select>
    </div>
    <div class="tw-flex form-checkbox tw-w-full">
      <h3 class="subtitle">Checkboxes</h3>
      <div class="tw-flew-row checkbox-group">
        <label for="checkbox_input">A checkbox<input type="checkbox" id="checkbox_input" name="checkbox_input">
        </label>
      </div>
    </div>
  </form>
  <h3 class="subtitle">Buttons</h3>
  <div class="tw-bg-light-purple tw-py-2 tw-px-2">
    <button type="button" class="btn">A button</button>
    <button type="button" class="btn light">A button</button>
    <button type="button" class="btn dark">A button</button>
    <button type="button" class="btn outline">A button</button>
  </div>
  <h2 class="tw-justify-start">
    Away-mode
  </h2>
  <h2 class="tw-justify-start">
    Miscellaneous
  </h2>
</div>
<script>
  import "../../../style/breakpoints.scss";
  import "../../../style/tailwind.scss";
</script>