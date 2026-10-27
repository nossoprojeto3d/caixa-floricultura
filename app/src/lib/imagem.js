// Reduz a foto do caderno antes de enviar: lado maior com até 2000 px, JPEG.
// Letra de mão precisa de nitidez, então não comprime demais.
// 1600 px ainda deixa a letra do caderno legível para a IA e sobe bem mais rápido que a foto inteira
export async function prepararFoto(arquivo, max = 1600, qualidade = 0.8) {
  const url = URL.createObjectURL(arquivo)
  try {
    const img = await new Promise((ok, erro) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = () => erro(new Error('Não consegui abrir essa foto.'))
      i.src = url
    })
    const escala = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(img.naturalWidth * escala)
    c.height = Math.round(img.naturalHeight * escala)
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    const dataUrl = c.toDataURL('image/jpeg', qualidade)
    return { dataUrl, base64: dataUrl.split(',')[1] }
  } finally { URL.revokeObjectURL(url) }
}
