import {
  Center,
  FormControl,
  FormHelperText,
  FormLabel,
  Icon,
  Input,
  Select,
  SelectContent,
  SelectIcon,
  SelectListbox,
  SelectOption,
  SelectOptionIndicator,
  SelectOptionText,
  SelectPlaceholder,
  SelectTrigger,
  SelectValue,
  Switch as HopeSwitch,
  Textarea,
} from "@hope-ui/solid"
import { For, Match, Show, Switch } from "solid-js"
import { useT } from "~/hooks"
import { Flag, SettingItem, Type } from "~/types"
import { TiDelete } from "solid-icons/ti"

export type ItemProps = SettingItem & {
  onChange?: (value: string) => void
  onDelete?: () => void
  hideLabel?: boolean
  w?: string
}

const Item = (props: ItemProps) => {
  const t = useT()
  return (
    <FormControl w={props.w ?? "100%"} display="flex" flexDirection="column">
      <Show when={!props.hideLabel}>
        <FormLabel for={props.key} display="flex" alignItems="center">
          {t(`settings.${props.key}`)}
          <Show when={props.flag === Flag.DEPRECATED}>
            <Icon
              ml="$2"
              as={TiDelete}
              boxSize="$5"
              color="$danger9"
              verticalAlign="middle"
              cursor="pointer"
              onClick={() => {
                props.onDelete?.()
              }}
            />
          </Show>
        </FormLabel>
      </Show>
      <Switch fallback={<Center>{t("settings_other.unknown_type")}</Center>}>
        <Match when={[Type.String, Type.Number].includes(props.type)}>
          <Input
            type={props.type === Type.Number ? "number" : ""}
            id={props.key}
            value={props.value}
            onInput={(e) => props.onChange?.(e.currentTarget.value)}
            readOnly={props.flag === Flag.READONLY}
          />
        </Match>
        <Match when={props.type === Type.Bool}>
          <HopeSwitch
            id={props.key}
            checked={props.value === "true"}
            onChange={(e: { currentTarget: HTMLInputElement }) =>
              props.onChange?.(e.currentTarget?.checked ? "true" : "false")
            }
            readOnly={props.flag === Flag.READONLY}
          />
        </Match>
        <Match when={props.type === Type.Text}>
          <Textarea
            id={props.key}
            value={props.value}
            onChange={(e) => props.onChange?.(e.currentTarget.value)}
            readOnly={props.flag === Flag.READONLY}
          />
        </Match>
        <Match when={props.type === Type.Select}>
          <Select
            id={props.key}
            value={props.value}
            onChange={(e) => props.onChange?.(e)}
            readOnly={props.flag === Flag.READONLY}
          >
            <SelectTrigger>
              <SelectPlaceholder>{t("global.choose")}</SelectPlaceholder>
              <SelectValue />
              <SelectIcon />
            </SelectTrigger>
            <SelectContent>
              <SelectListbox>
                <For each={props.options?.split(",")}>
                  {(item) => (
                    <SelectOption value={item}>
                      <SelectOptionText>
                        {t(`settings.${props.key}s.${item}`)}
                      </SelectOptionText>
                      <SelectOptionIndicator />
                    </SelectOption>
                  )}
                </For>
              </SelectListbox>
            </SelectContent>
          </Select>
        </Match>
      </Switch>
      <FormHelperText>
        {props.help ? t(`settings.${props.key}-tips`) : ""}
      </FormHelperText>
    </FormControl>
  )
}

export { Item }
