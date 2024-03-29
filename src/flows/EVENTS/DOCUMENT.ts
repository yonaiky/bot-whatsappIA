import fs from "fs/promises";
import { addKeyword, EVENTS } from "@builderbot/bot";
import { MemoryDB as Database } from "@builderbot/bot";
import { BaileysProvider as Provider } from "@builderbot/provider-baileys";
import uploadFileStream from "../../services/cloudinary";
import path from "path";
import geminiAI from "../geminiAI";

const documentsFolder = (dirs: string[] = []) =>
  path.join(process.cwd(), "src", "documents", ...dirs);

export default addKeyword<Provider, Database>(EVENTS.DOCUMENT)
  .addAnswer("Estare leyendo tu archivo, tardare unos segundos...")
  .addAction(async (message, { provider, gotoFlow, endFlow }) => {
    const { mimetype, fileName } = message.message.documentMessage;
    let result: any;
    if (!["application/pdf"].includes(mimetype))
      return endFlow("Archivo no compatible");

    const localPathFile = await provider.saveFile(message, {
      path: "././src/documents",
    });

    // const localFilename = path.parse(localPathFile).base;

    try {
      result = await uploadFileStream(localPathFile, {
        folder: "pdf",
        ocr: "adv_ocr",
      });
    } catch (error) {
      console.log("error", error);
      return endFlow("Error al intentar leer el archivo");
    }

    const { format, secure_url, info } = result;
    const data = info.ocr.adv_ocr.data;

    const text = data
      .map((blocks: { textAnnotations: { description: string }[] }) => {
        const annotations = blocks["textAnnotations"] ?? {};
        const first = annotations[0] ?? {};
        const content = first["description"] ?? "";
        return content.trim();
      })
      .filter(Boolean)
      .join("\n");

    const id: string = message.key.remoteJid;

    await fs.writeFile(
      documentsFolder([`${id}.txt`]), //`${localFilename.split(".")[0]}.txt`
      text,
      { encoding: "utf8", flag: "w" }
    );
    // console.log("id", id);
    // const page1jpg = secure_url
    //   .replaceAll(".pdf", ".jpg")
    //   .replaceAll("/upload/", "/upload/pg_1/");

    return gotoFlow(geminiAI);
    //
  });
