import { Portal } from "solid-js/web"
import { Center } from "./Center"
import { Right } from "./Right"
import { Copy, Move } from "./CopyMove"
import { Delete } from "./Delete"
import { Rename } from "./Rename"
import { NewFile } from "./NewFile"
import { Mkdir } from "./Mkdir"
import { RecursiveMove } from "./RecursiveMove"
import { RemoveEmptyDirectory } from "./RemoveEmptyDirectory"
import { BatchRename } from "./BatchRename"
import { OfflineDownloadEnhanced } from "./OfflineDownloadEnhanced"
import { PackageDownloadModal } from "./Download"
import { lazy } from "solid-js"
import { ModalWrapper } from "./ModalWrapper"
import { LocalSettings } from "./LocalSettings"
import { BackTop } from "./BackTop"
import { Decompress } from "./Decompress"
import { Share } from "./Share"

const Upload = lazy(() => import("../uploads/Upload"))

export const Modal = () => {
  return (
    <>
      <Copy />
      <Move />
      <Rename />
      <Delete />
      <Decompress />
      <NewFile />
      <Mkdir />
      <Share />
      <RecursiveMove />
      <RemoveEmptyDirectory />
      <BatchRename />
      <OfflineDownloadEnhanced />
      <PackageDownloadModal />
      <ModalWrapper name="upload" title="home.toolbar.upload">
        <Upload />
      </ModalWrapper>
      <LocalSettings />
    </>
  )
}

export const Toolbar = () => {
  return (
    <Portal>
      <Right />
      <Center />
      <Modal />
      <BackTop />
    </Portal>
  )
}
