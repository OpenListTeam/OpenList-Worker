import { Box, Grid, Text } from "@hope-ui/solid"
import { For, Show } from "solid-js"
import { GridItem } from "./GridItem"
import "lightgallery/css/lightgallery-bundle.css"
import { smartCountMsg, local, objStore } from "~/store"
import { useSelectWithMouse } from "./helper"

const GridLayout = () => {
  const { isMouseSupported, registerSelectContainer, captureContentMenu } =
    useSelectWithMouse()
  registerSelectContainer()
  return (
    <>
      <Show when={local["show_count_msg"] === "visible"}>
        <Box w="100%" textAlign="left" pl="$2">
          <Text size="sm" color="$neutral11">
            {smartCountMsg()}
          </Text>
        </Box>
      </Show>
      <Grid
        oncapture:contextmenu={captureContentMenu}
        class="viselect-container"
        w="$full"
        gap="$1"
        templateColumns={`repeat(auto-fill, minmax(${
          parseInt(local["grid_item_size"]) + 20
        }px,1fr))`}
      >
        <For each={objStore.objs}>
          {(obj, i) => {
            return <GridItem obj={obj} index={i()} />
          }}
        </For>
      </Grid>
    </>
  )
}

export default GridLayout
