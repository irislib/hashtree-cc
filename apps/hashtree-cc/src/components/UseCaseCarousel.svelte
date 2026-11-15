<script lang="ts">
  import { flushSync, onMount } from 'svelte';
  import SectionHeading from './SectionHeading.svelte';
  const baseUrl = import.meta.env.BASE_URL;

  const slides = [
    {
      src: `${baseUrl}screenshot-iris-files.webp`,
      title: 'Iris Files',
      desc: 'Git repos, file manager, pull requests, issues — all decentralized.',
      href: 'https://files.iris.to',
    },
    {
      src: `${baseUrl}screenshot-iris-audio.webp`,
      title: 'Iris Audio',
      desc: 'Music player.',
      href: 'https://audio.iris.to',
    },
    {
      src: `${baseUrl}screenshot-iris-docs.webp`,
      title: 'Iris Docs',
      desc: 'Collaborative documents with comments and real-time editing.',
      href: 'https://docs.iris.to',
    },
    {
      src: `${baseUrl}screenshot-iris-video.webp`,
      title: 'Iris Video',
      desc: 'Video streaming and playlists over content-addressed storage.',
      href: 'https://video.iris.to',
    },
    {
      src: `${baseUrl}screenshot-iris-chat.webp`,
      title: 'Iris Chat',
      desc: 'Secure file sharing in a nostr-based encrypted chat.',
      href: 'https://chat.iris.to',
    },
    {
      src: `${baseUrl}screenshot-git-push.webp`,
      title: 'Decentralized Git',
      desc: 'Push and pull repos with htree:// URLs. No server required.',
    },
  ];

  // The end copies let the track move one slide across either boundary.
  const trackSlides = [slides[slides.length - 1], ...slides, slides[0]];
  let position = $state(1);
  let current = $derived((position - 1 + slides.length) % slides.length);
  let dragOffset = $state(0);
  let instant = $state(false);
  let viewportEl: HTMLDivElement;
  let trackEl: HTMLDivElement;
  let isHovered = false;
  let hasFocusWithin = false;
  let reducedMotion = false;
  let autoInterval: ReturnType<typeof setInterval> | undefined;

  let drag: {
    pointer: number;
    startX: number;
    startY: number;
    initialOffset: number;
    axis: 'undecided' | 'horizontal' | 'vertical';
    lastX: number;
    lastMoveAt: number;
    velocity: number;
  } | undefined;

  function startAuto() {
    stopAuto();
    if (slides.length < 2 || isHovered || hasFocusWithin || drag || reducedMotion) return;
    autoInterval = setInterval(next, 5000);
  }

  function stopAuto() {
    clearInterval(autoInterval);
    autoInterval = undefined;
  }

  // Pin the visible frame, even if a new gesture interrupts a transition.
  function pinTrack() {
    const translation = new DOMMatrixReadOnly(getComputedStyle(trackEl).transform).m41;
    const offset = translation + position * trackEl.getBoundingClientRect().width;
    const canonical = current + 1;
    flushSync(() => {
      instant = true;
      position = canonical;
      dragOffset = offset;
    });
    trackEl.getBoundingClientRect();
  }

  function recenterEndCopy() {
    if (position === current + 1) return;
    pinTrack();
    instant = false;
    dragOffset = 0;
  }

  function step(direction: number) {
    recenterEndCopy();
    position += direction;
    dragOffset = 0;
    instant = false;
    startAuto();
  }

  function prev() { step(-1); }
  function next() { step(1); }

  function go(i: number) {
    if (i === (current + 1) % slides.length) return next();
    if (i === (current - 1 + slides.length) % slides.length) return prev();
    recenterEndCopy();
    position = i + 1;
    startAuto();
  }

  function onPointerDown(e: PointerEvent) {
    if (!e.isPrimary || e.button !== 0 || drag) return;
    stopAuto();
    pinTrack();
    drag = {
      pointer: e.pointerId, startX: e.clientX, startY: e.clientY,
      initialOffset: dragOffset, axis: 'undecided', lastX: e.clientX,
      lastMoveAt: e.timeStamp, velocity: 0,
    };
    viewportEl.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.pointer) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (drag.axis === 'undecided' && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
      drag.axis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
    }
    if (drag.axis !== 'horizontal') return;
    const elapsed = e.timeStamp - drag.lastMoveAt;
    if (e.clientX !== drag.lastX) {
      if (elapsed > 0) drag.velocity = (e.clientX - drag.lastX) / elapsed;
      drag.lastX = e.clientX;
      drag.lastMoveAt = e.timeStamp;
    }
    const width = viewportEl.clientWidth;
    dragOffset = Math.max(-width, Math.min(width, drag.initialOffset + dx));
  }

  function finishDrag(direction = 0) {
    if (!drag) return;
    const { pointer } = drag;
    drag = undefined;
    if (viewportEl.hasPointerCapture(pointer)) viewportEl.releasePointerCapture(pointer);
    step(direction);
  }

  function onPointerUp(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.pointer) return;
    onPointerMove(e);
    const distance = e.clientX - drag.startX;
    const velocity = e.timeStamp - drag.lastMoveAt <= 100 ? drag.velocity : 0;
    const flick = Math.abs(distance) > 20 && Math.abs(velocity) > 0.3;
    const farEnough = Math.abs(distance) > viewportEl.clientWidth / 2;
    const direction = drag.axis === 'horizontal' && (flick || farEnough)
      ? -Math.sign(flick ? velocity : distance) : 0;
    finishDrag(direction);
  }

  function cancelPointer(e: PointerEvent) {
    if (drag?.pointer === e.pointerId) finishDrag();
  }

  // iOS turns a horizontal swipe that drifts downward into a vertical pan and cancels it;
  // once the swipe is horizontal, keep the touch for the carousel.
  function holdHorizontalSwipe(node: HTMLElement) {
    const hold = (e: TouchEvent) => { if (drag?.axis === 'horizontal' && e.cancelable) e.preventDefault(); };
    node.addEventListener('touchmove', hold, { passive: false });
    return { destroy: () => node.removeEventListener('touchmove', hold) };
  }

  function cancelOnSecondPointer(e: PointerEvent) {
    if (drag && e.pointerId !== drag.pointer) finishDrag();
  }

  function onMouseEnter() {
    isHovered = true;
    stopAuto();
  }

  function onMouseLeave() {
    isHovered = false;
    startAuto();
  }

  function onFocusIn() {
    hasFocusWithin = true;
    stopAuto();
  }

  function onFocusOut(e: FocusEvent) {
    const currentTarget = e.currentTarget;
    const relatedTarget = e.relatedTarget;
    if (
      currentTarget instanceof HTMLElement &&
      relatedTarget instanceof Node &&
      currentTarget.contains(relatedTarget)
    ) {
      return;
    }
    hasFocusWithin = false;
    startAuto();
  }

  onMount(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    function updateMotion() {
      reducedMotion = preference.matches;
      startAuto();
    }
    updateMotion();
    preference.addEventListener('change', updateMotion);
    return () => {
      stopAuto();
      preference.removeEventListener('change', updateMotion);
    };
  });
</script>

<svelte:window onpointerdowncapture={cancelOnSecondPointer} />

<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div
  class="bg-surface-1 rounded-xl p-6 mb-8 outline-none"
  role="region"
  aria-label="Use case carousel"
  tabindex="0"
  onkeydown={(e) => {
    if (e.key === 'ArrowRight') { next(); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { prev(); e.preventDefault(); }
  }}
  onmouseenter={onMouseEnter}
  onmouseleave={onMouseLeave}
  onfocusin={onFocusIn}
  onfocusout={onFocusOut}
>
  <SectionHeading id="built-on-hashtree">Built on Hashtree</SectionHeading>

  <div class="relative select-none max-w-lg mx-auto">
    <div
      bind:this={viewportEl}
      use:holdHorizontalSwipe
      class="overflow-hidden rounded-lg"
      role="group"
      aria-label="Use case slides"
      style="touch-action: pan-y pinch-zoom;"
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointercancel={cancelPointer}
      onlostpointercapture={cancelPointer}
    >
      <div
        bind:this={trackEl}
        class="track flex"
        class:instant
        style:transform={`translateX(calc(-${position * 100}% + ${dragOffset}px))`}
        ontransitionend={(e) => { if (e.target === trackEl && e.propertyName === 'transform') recenterEndCopy(); }}
      >
        {#each trackSlides as slide, i}
          <div class="w-full shrink-0" aria-hidden={i !== current + 1}>
            <img
              src={slide.src}
              alt={i === 0 || i === trackSlides.length - 1 ? '' : slide.title}
              class="w-full block"
              draggable="false"
            />
          </div>
        {/each}
      </div>
    </div>

    <!-- Caption -->
    <div class="mt-3 mb-2 text-center">
      <p class="text-text-1 font-semibold mb-1">
        {#if slides[current].href}
          <a href={slides[current].href} target="_blank" rel="noopener" class="text-accent hover:underline">{slides[current].title}</a>
        {:else}
          {slides[current].title}
        {/if}
      </p>
      <p class="text-text-3 text-sm">{slides[current].desc}</p>
    </div>

    <!-- Prev / Next -->
    <button
      type="button"
      class="absolute left-2 top-1/2 z-10 -translate-y-1/2 h-9 w-9 rounded-full flex-center text-text-1 bg-surface-1/90 border border-surface-3 hover:bg-surface-2 outline-none"
      onpointerdown={(e) => e.stopPropagation()}
      onclick={(e) => { e.stopPropagation(); prev(); }}
      aria-label="Previous"
    >
      <span class="i-lucide-chevron-left"></span>
    </button>
    <button
      type="button"
      class="absolute right-2 top-1/2 z-10 -translate-y-1/2 h-9 w-9 rounded-full flex-center text-text-1 bg-surface-1/90 border border-surface-3 hover:bg-surface-2 outline-none"
      onpointerdown={(e) => e.stopPropagation()}
      onclick={(e) => { e.stopPropagation(); next(); }}
      aria-label="Next"
    >
      <span class="i-lucide-chevron-right"></span>
    </button>
  </div>

  <!-- Dots -->
  <div class="flex justify-center gap-2 mt-4">
    {#each slides as _, i}
      <button
        class="w-2 h-2 rounded-full transition-colors {i === current ? 'bg-accent' : 'bg-surface-3 hover:bg-text-3'}"
        onclick={() => go(i)}
        aria-label="Slide {i + 1}"
        aria-current={i === current ? 'true' : undefined}
      ></button>
    {/each}
  </div>
</div>

<style>
  .track { transition: transform 300ms ease-out; }
  .track.instant { transition: none; }
  @media (prefers-reduced-motion: reduce) {
    .track { transition: none; }
  }
</style>
