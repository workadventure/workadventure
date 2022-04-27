<div class="tw-container">

  <h2 class="tw-justify-start small-blue-title">
    Buttons
  </h2>
  <div class="tw-bg-light-purple tw-py-2 tw-px-2">
    <button type="button">Simple btn</button>
    <button type="button" class="light">Light btn</button>
    <button type="button" class="dark">Dark btn</button>
    <button type="button" class="outline">Outlined btn</button>
  </div>

  <!--- Here starts real theming stuff -->
  <h2 class="small-blue-title">Form stuff</h2>
  <p>Selects</p>
  <select name="test-select" id="test-select" class="tw-w-full">
    <option>1</option>
    <option>2</option>
    <option>3</option>
  </select>

  <p>Inputs</p>
  <input type="email" class="tw-w-full" placeholder="My placeholder lol"/>

  <p>Checkboxes</p>
  <label for="real_checkbox" class="">A checkbox
    <input type="checkbox" id="real_checkbox">
  </label>
  <label for="real_checkbox2" class="">A checkbox
    <input type="checkbox" id="real_checkbox2">
  </label>
  <p>Radios</p>
  <label for="real_checkbox3" class="">A radio button
    <input type="radio" id="real_checkbox3">
  </label>
</div>
<script>
  import "../../../style/breakpoints.scss";
  import "../../../style/tailwind.scss";
</script>