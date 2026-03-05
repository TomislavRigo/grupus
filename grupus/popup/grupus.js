const ADD_GROUP = "add-group";
const CONTENT = "content";
const DATA_KEY = "grupus_data";

/**
 * @typedef {{name: string, tabs: string[]}} GroupConfig
 */

/**
 * Normalizes URL for use in tab creation.
 * @param raw {string} Raw URL value.
 * @returns {string} URL with schema.
*/
function normalizeUrl(raw) {
  try {
    return new URL(raw).toString();
  } catch {
    return new URL(`https://${raw}`).toString();
  }
}

/**
  * Get groups config.
  * @returns {Promise<GroupConfig[]>} Groups config
*/
async function getConfig() {
  try {
    const { groupsConfig } = await browser.storage.local.get({ groupsConfig: [] })
    return groupsConfig || []
  } catch {
    return []
  }
}

/**
  * Set groups config.
  * @param config {GroupConfig[]} Groups config.
*/
async function setConfig(config) {
  return await browser.storage.local.set({ groupsConfig: config })
}


/**
  * Create tab entry.
  * @param groupId {number} Group index.
  * @param tabId {number} Tab index.
  * @param config {GroupConfig[]} Groups configurations.
  * @returns {HTMLElement} Tab element.
*/
function createTab(groupId, tabId, config) {
  const urlInput = document.createElement("input")
  urlInput.type = "text"
  urlInput.value = config[groupId].tabs[tabId]
  urlInput.dataset.key = `${groupId}:${tabId}`
  urlInput.addEventListener("change", async (event) => {
    const index = event.target.dataset.key.split(":")
    config[index[0]].tabs[index[1]] = event.target.value
    await setConfig(config)
    await render()
  })

  const button = document.createElement("button")
  button.innerText = "REMOVE"
  button.dataset.key = `${groupId}:${tabId}`
  button.addEventListener("click", async (event) => {
    const index = event.target.dataset.key.split(":")
    config[index[0]].tabs = config[index[0]].tabs.filter((_, index) => index != tabId)
    await setConfig(config)
    await render()
  })

  const element = document.createElement("div")
  element.classList.add("tab")
  element.appendChild(urlInput)
  element.appendChild(button)

  return element
}


/**
  * Creates tabs element.
  * @param groupId {number} Group index.
  * @param config {GroupConfig[]} Groups configuration.
  * @return {HTMLElement} Tabs html element.
*/
function createTabs(groupId, config) {
  const tabs = config[groupId].tabs.map((_, index) => createTab(groupId, index, config))
  const element = document.createElement("div")
  element.classList.add("tabs")

  const addInput = document.createElement("input")
  addInput.type = "text"
  addInput.value = ""
  addInput.addEventListener("change", async (event) => {
    config[groupId].tabs = [...config[groupId].tabs, event.target.value]
    await setConfig(config)
    await render()
  })

  for (let index = 0; index < tabs.length; index++) {
    element.appendChild(tabs[index])
  }
  element.appendChild(addInput)

  return element
}

/**
  * Create group element.
  * @param groupId {number} Group index.
  * @param config {GroupConfig[]} Groups configuration.
  * @returns {HTMLElement} Group html element.
*/
function createGroup(groupId, config) {
  const title = document.createElement("input")
  title.type = "text"
  title.value = config[groupId].name
  title.addEventListener("change", async (event) => {
    config[groupId].name = event.target.value
    await setConfig(config)
    await render()
  })

  const apply = document.createElement("button")
  apply.innerText = "APPLY"
  apply.addEventListener("click", async () => {
    const tabIds = await Promise.all(config[groupId].tabs.map(async (url) => {
      const tab = await browser.tabs.create({ "url": url })
      return tab.id
    }))

    const tabGroupId = await browser.tabs.group({ "tabIds": tabIds })
    _ = await browser.tabGroups.update(tabGroupId, { "title": config[groupId].name })
  })

  const del = document.createElement("button")
  del.innerText = "DELETE"
  del.addEventListener("click", async () => {
    const newConfig = config.filter((_, index) => index != groupId)
    await setConfig(newConfig)
    await render()
  })

  const header = document.createElement("div")
  header.classList.add("group-header", "header", "border--bottom")
  header.appendChild(title)
  header.appendChild(apply)
  header.appendChild(del)

  const tabs = createTabs(groupId, config)

  const element = document.createElement("div")
  element.classList.add("group", "border")
  element.appendChild(header)
  element.appendChild(tabs)

  return element
}

/**
  * Create groups.
  * @param config {GroupConfig[]} Groups configurations.
  * @returns {HTMLElement[]} Groups html element.
*/
function createGroups(config) {
  return config.map((_, index) => createGroup(index, config))
}

async function render() {
  const config = await getConfig()
  const groups = createGroups(config)

  const content = document.getElementById(CONTENT)
  content.innerHTML = ""
  for (let group of groups) {
    content.appendChild(group)
  }
}

async function initialize() {
  const addGroupButton = document.getElementById(ADD_GROUP)
  addGroupButton.addEventListener("click", async () => {
    const config = await getConfig()
    await setConfig([...config, { "name": "New Group", "tabs": [] }])
    await render()
  })
  await render()
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
