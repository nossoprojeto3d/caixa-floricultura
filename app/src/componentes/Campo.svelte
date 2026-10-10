<script>
  // Rótulo + campo, para os formulários
  let { rotulo, dica = '', children, class: cls = '' } = $props()
</script>

<label class="block {cls}">
  <span class="mb-1.5 block text-[13px] font-medium text-txt-2">{rotulo}</span>
  {@render children()}
  {#if dica}<span class="mt-1 block text-[12px] text-txt-3">{dica}</span>{/if}
</label>
