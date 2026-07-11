import {
  Center,
  ElementType,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  MenuTriggerProps,
  Spinner,
  useColorModeValue,
} from "@hope-ui/solid"
import { createSignal, For, Show } from "solid-js"
import { Lang, languages, setCurrentLang } from "~/app/i18n"
// import { TbLanguageHiragana } from "solid-icons/tb";
import { IoLanguageOutline } from "solid-icons/io"
import { Portal } from "solid-js/web"

const [fetchingLang, setFetchingLang] = createSignal(false)

export const SwitchLanguage = <C extends ElementType = "button">(
  props: MenuTriggerProps<C>,
) => {
  const switchLang = async (lang: Lang) => {
    setCurrentLang(lang)
    localStorage.setItem("lang", lang)
  }

  if (!localStorage.getItem("lang")) {
    const defaultCode = languages.find((l) => l.code.toLowerCase() === navigator.language.toLowerCase())?.code ||
      languages.find((l) => l.code.toLowerCase().split("-")[0] === navigator.language.toLowerCase().split("-")[0])?.code ||
      "en"
    switchLang(defaultCode)
  }

  return (
    <>
      <Menu>
        <MenuTrigger cursor="pointer" {...props} />
        <MenuContent>
          <For each={languages}>
            {(lang, i) => (
              <MenuItem
                onSelect={() => {
                  switchLang(lang.code)
                }}
              >
                {lang.lang}
              </MenuItem>
            )}
          </For>
        </MenuContent>
      </Menu>
      <Show when={fetchingLang()}>
        <Portal>
          <Center
            h="$full"
            w="$full"
            pos="fixed"
            top={0}
            bg={useColorModeValue("$blackAlpha4", "$whiteAlpha4")()}
            zIndex="$notification"
          >
            <Spinner
              thickness="4px"
              speed="0.65s"
              emptyColor="$neutral4"
              color="$info10"
              size="xl"
            />
          </Center>
        </Portal>
      </Show>
    </>
  )
}

export const SwitchLanguageWhite = () => (
  <SwitchLanguage as={IoLanguageOutline} boxSize="$8" />
)
