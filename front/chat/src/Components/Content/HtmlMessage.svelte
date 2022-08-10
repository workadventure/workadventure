<script lang="ts">
  import { iframeListener } from "../../IframeListener";
  import { onDestroy, onMount, beforeUpdate } from "svelte";
  import { linkFunction } from "../../Services/WebLinkManager";
  import { marked } from "marked";

  const checkIcone = `<svg xmlns="http://www.w3.org/2000/svg" width="14px" height="14px" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-check tw-text-pop-green"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  const alertCircleIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14px" height="14px" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-alert-circle "><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  const LoaderIcon = `...`;
  export let html: string;

  function openCoWebsite(event: Event, link: HTMLElement) {
    event.stopPropagation();

    const embedLink = link.getAttribute("data-embed-link");
    if (embedLink == undefined) {
      appendIconInHtmlElement(link, alertCircleIcon);
      return;
    }

    const iframeAllow = link.getAttribute("data-allow");
    const cunction = link.getAttribute("data-function");
    switch (cunction) {
      case linkFunction.openCowebsite:
        iframeListener.openCoWebsite(
          embedLink,
          true,
          iframeAllow ?? "allowfullscreen"
        );

        //UX animation
        appendIconInHtmlElement(link, LoaderIcon);
        setTimeout(() => {
          appendIconInHtmlElement(link, checkIcone);
        }, 1000);
        break;
      case linkFunction.copyLink:
        appendIconInHtmlElement(link, LoaderIcon);
        navigator.clipboard
          .writeText(embedLink)
          .then(() => {
            appendIconInHtmlElement(link, checkIcone);
          })
          .catch((err) => {
            appendIconInHtmlElement(link, alertCircleIcon);
            console.error("Navigator clipboard write text error => ", err);
          });
        break;
    }
  }

  function appendIconInHtmlElement(link: HTMLElement, icon: string) {
    const element = document.createElement("span");
    element.innerHTML = icon;
    element.classList.add("tw-ml-1");
    if (link.lastChild != undefined && link.childNodes.length > 1) {
      link.removeChild(link.lastChild);
    }
    link.appendChild(element);
  }

  function clickAnchorElement(remove = false) {
    const elements = document.getElementsByClassName(
      "iframe-openwebsite"
    ) as HTMLCollectionOf<HTMLElement>;
    if (elements == undefined || elements.length === 0) return;
    for (const element of elements) {
      if (remove) {
        element.removeEventListener("click", (event) =>
          openCoWebsite(event, element)
        );
      } else {
        element.addEventListener("click", (event) =>
          openCoWebsite(event, element)
        );
      }
    }
  }

  beforeUpdate(() => {
    html = marked.parse(html);
  });

  onMount(() => {
    clickAnchorElement(false);
  });

  onDestroy(() => {
    clickAnchorElement(true);
  });
</script>

{@html html}
