import Indexes from "./indexes"
import Scan from "~/pages/manage/indexes/scan"
import { VStack } from "@hope-ui/solid"

const IndexPage = () => {
  return (
    <VStack spacing="$2" w="$full" alignItems="start">
      <Indexes />
      <Scan />
    </VStack>
  )
}

export default IndexPage
