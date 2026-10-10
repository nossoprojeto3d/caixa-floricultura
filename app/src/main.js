import { mount } from 'svelte'
import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/fraunces/full-italic.css'
import '@fontsource-variable/figtree'
import './app.css'
import App from './App.svelte'

export default mount(App, { target: document.getElementById('app') })
