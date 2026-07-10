import { useManageTitle } from "~/hooks"
import { VStack } from "@hope-ui/solid"
import { TypeTasks } from "~/pages/manage/tasks/Tasks"
import {
  getDecompressNameAnalyzer,
  getDecompressUploadNameAnalyzer,
} from "~/pages/manage/tasks/helper"

const Decompress = () => {
  useManageTitle("manage.sidemenu.decompress")
  return (
    <VStack w="$full" alignItems="start" spacing="$4">
      <TypeTasks
        type="decompress"
        canRetry
        nameAnalyzer={getDecompressNameAnalyzer()}
      />
      <TypeTasks
        type="decompress_upload"
        canRetry
        nameAnalyzer={getDecompressUploadNameAnalyzer()}
      />
    </VStack>
  )
}

export default Decompress
