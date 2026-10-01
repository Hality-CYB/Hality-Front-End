import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { useCamera } from "@/hooks/use-camera";

type Camera = ReturnType<typeof useCamera>;

function mockMediaDevices(getUserMedia: unknown, cameras?: number) {
  const enumerateDevices =
    cameras === undefined
      ? undefined
      : vi
          .fn()
          .mockResolvedValue([
            ...Array.from({ length: cameras }, () => ({ kind: "videoinput" })),
            { kind: "audioinput" },
          ]);
  Object.defineProperty(navigator, "mediaDevices", {
    value: getUserMedia ? { getUserMedia, enumerateDevices } : undefined,
    configurable: true,
  });
}

function streamFalso(facingMode?: string) {
  const track = { stop: vi.fn(), getSettings: () => ({ facingMode }) };
  const stream = {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream;
  return { stream, track };
}

/** Renderiza o hook ligado a um <video> de verdade, como no wizard. */
function renderCamera(ativaInicial: boolean) {
  const atual: { camera?: Camera } = {};
  function Teste({ ativa }: { ativa: boolean }) {
    const camera = useCamera(ativa);
    atual.camera = camera;
    return <video ref={camera.videoRef} data-testid="video" />;
  }
  const utils = render(<Teste ativa={ativaInicial} />);
  const video = utils.getByTestId("video") as HTMLVideoElement;
  return {
    video,
    camera: () => atual.camera!,
    setAtiva: (ativa: boolean) => utils.rerender(<Teste ativa={ativa} />),
    unmount: utils.unmount,
  };
}

describe("useCamera", () => {
  afterEach(() => {
    mockMediaDevices(undefined);
    vi.restoreAllMocks();
  });

  it("fica indisponível quando o navegador não tem getUserMedia (ex.: http fora de localhost)", async () => {
    const { camera } = renderCamera(true);
    await waitFor(() => expect(camera().estado).toBe("indisponivel"));
  });

  it.each([
    ["NotAllowedError", "negada"],
    ["SecurityError", "negada"],
    ["NotFoundError", "indisponivel"],
    ["OverconstrainedError", "indisponivel"],
    ["AbortError", "erro"],
  ])("getUserMedia rejeitando com %s deixa o estado %s", async (nome, esperado) => {
    mockMediaDevices(vi.fn().mockRejectedValue(new DOMException("falhou", nome)));
    const { camera } = renderCamera(true);
    await waitFor(() => expect(camera().estado).toBe(esperado));
  });

  it("não pede a câmera enquanto não está ativa", () => {
    const getUserMedia = vi.fn();
    mockMediaDevices(getUserMedia);
    renderCamera(false);
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("pede a câmera traseira sem áudio, liga o stream no <video> e só fica ativa com os metadados", async () => {
    const { stream } = streamFalso("environment");
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    mockMediaDevices(getUserMedia);

    const { video, camera } = renderCamera(true);

    await waitFor(() => expect(video.srcObject).toBe(stream));
    expect(getUserMedia).toHaveBeenCalledWith({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });
    expect(camera().estado).toBe("iniciando");

    act(() => {
      video.dispatchEvent(new Event("loadedmetadata"));
    });
    expect(camera().estado).toBe("ativa");
  });

  it("para as tracks e solta o stream quando deixa de estar ativa", async () => {
    const { stream, track } = streamFalso("environment");
    mockMediaDevices(vi.fn().mockResolvedValue(stream));
    const { video, setAtiva } = renderCamera(true);
    await waitFor(() => expect(video.srcObject).toBe(stream));

    setAtiva(false);

    expect(track.stop).toHaveBeenCalled();
    expect(video.srcObject).toBeNull();
  });

  it("para as tracks quando o componente desmonta", async () => {
    const { stream, track } = streamFalso("environment");
    mockMediaDevices(vi.fn().mockResolvedValue(stream));
    const { video, unmount } = renderCamera(true);
    await waitFor(() => expect(video.srcObject).toBe(stream));

    unmount();

    expect(track.stop).toHaveBeenCalled();
  });

  it("se sair do passo antes da permissão resolver, para o stream que chegar atrasado", async () => {
    const { stream, track } = streamFalso("environment");
    let liberar!: (s: MediaStream) => void;
    mockMediaDevices(vi.fn(() => new Promise<MediaStream>((resolve) => (liberar = resolve))));
    const { video, camera, setAtiva } = renderCamera(true);

    setAtiva(false);
    await act(async () => liberar(stream));

    expect(track.stop).toHaveBeenCalled();
    expect(video.srcObject).toBeFalsy();
    expect(camera().estado).not.toBe("ativa");
  });

  it("ignora um erro de permissão que chega depois de sair do passo", async () => {
    let recusar!: (e: unknown) => void;
    mockMediaDevices(vi.fn(() => new Promise<MediaStream>((_, reject) => (recusar = reject))));
    const { camera, setAtiva } = renderCamera(true);
    const estadoAntes = camera().estado;

    setAtiva(false);
    await act(async () => recusar(new DOMException("negado", "NotAllowedError")));

    expect(camera().estado).toBe(estadoAntes);
  });

  it("ignora metadados que chegam depois de sair do passo", async () => {
    const { stream } = streamFalso("environment");
    mockMediaDevices(vi.fn().mockResolvedValue(stream));
    const { video, camera, setAtiva } = renderCamera(true);
    await waitFor(() => expect(video.srcObject).toBe(stream));
    const aoCarregar = video.onloadedmetadata;

    setAtiva(false);
    act(() => {
      aoCarregar?.call(video, new Event("loadedmetadata"));
    });

    expect(camera().estado).toBe("iniciando");
  });

  describe("alternar câmera", () => {
    it.each([
      [2, true],
      [1, false],
    ])("com %i câmera(s) no aparelho, podeAlternar é %s", async (cameras, esperado) => {
      const { stream } = streamFalso("environment");
      mockMediaDevices(vi.fn().mockResolvedValue(stream), cameras);
      const { video, camera } = renderCamera(true);
      await waitFor(() => expect(video.srcObject).toBe(stream));

      await waitFor(() => expect(camera().podeAlternar).toBe(esperado));
    });

    it("troca da traseira para a frontal e de volta, parando o stream anterior", async () => {
      const traseira = streamFalso("environment");
      const frontal = streamFalso("user");
      const traseiraDeNovo = streamFalso("environment");
      const getUserMedia = vi
        .fn()
        .mockResolvedValueOnce(traseira.stream)
        .mockResolvedValueOnce(frontal.stream)
        .mockResolvedValueOnce(traseiraDeNovo.stream);
      mockMediaDevices(getUserMedia, 2);
      const { video, camera } = renderCamera(true);
      await waitFor(() => expect(video.srcObject).toBe(traseira.stream));

      act(() => camera().alternarCamera());

      await waitFor(() => expect(video.srcObject).toBe(frontal.stream));
      expect(traseira.track.stop).toHaveBeenCalled();
      expect(getUserMedia).toHaveBeenLastCalledWith(
        expect.objectContaining({
          video: expect.objectContaining({ facingMode: { ideal: "user" } }),
        }),
      );

      act(() => camera().alternarCamera());

      await waitFor(() => expect(video.srcObject).toBe(traseiraDeNovo.stream));
      expect(frontal.track.stop).toHaveBeenCalled();
      expect(getUserMedia).toHaveBeenLastCalledWith(
        expect.objectContaining({
          video: expect.objectContaining({ facingMode: { ideal: "environment" } }),
        }),
      );
    });

    it("a foto tirada com a frontal informa facingMode user", async () => {
      mockMediaDevices(
        vi
          .fn()
          .mockResolvedValueOnce(streamFalso("environment").stream)
          .mockResolvedValueOnce(streamFalso("user").stream),
        2,
      );
      const { video, camera } = renderCamera(true);
      Object.defineProperty(video, "videoWidth", { value: 640, configurable: true });
      Object.defineProperty(video, "videoHeight", { value: 480, configurable: true });
      await waitFor(() => expect(video.srcObject).toBeTruthy());

      act(() => camera().alternarCamera());
      await waitFor(() => expect(camera().podeAlternar).toBe(true));
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
        drawImage: vi.fn(),
      } as unknown as CanvasRenderingContext2D);
      vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback, type) =>
        callback(new Blob(["x"], { type })),
      );

      await waitFor(async () => expect((await camera().capturar()).facingMode).toBe("user"));
    });
  });

  describe("capturar", () => {
    async function cameraAtiva(largura: number, altura: number, facingMode?: string) {
      mockMediaDevices(vi.fn().mockResolvedValue(streamFalso(facingMode).stream));
      const r = renderCamera(true);
      Object.defineProperty(r.video, "videoWidth", { value: largura, configurable: true });
      Object.defineProperty(r.video, "videoHeight", { value: altura, configurable: true });
      await waitFor(() => expect(r.video.srcObject).toBeTruthy());
      act(() => {
        r.video.dispatchEvent(new Event("loadedmetadata"));
      });
      return r;
    }

    function mockCanvas() {
      const drawImage = vi.fn();
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
        drawImage,
      } as unknown as CanvasRenderingContext2D);
      const toBlob = vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
        this: HTMLCanvasElement,
        callback,
        type,
      ) {
        callback(new Blob([`${this.width}x${this.height}`], { type }));
      });
      return { drawImage, toBlob };
    }

    it("gera um JPEG do frame atual no tamanho real do vídeo, sem espelhar", async () => {
      const { video, camera } = await cameraAtiva(1280, 720, "environment");
      const { drawImage, toBlob } = mockCanvas();

      const captura = await camera().capturar();

      expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 1280, 720);
      expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", 0.92);
      expect(captura.largura).toBe(1280);
      expect(captura.altura).toBe(720);
      expect(captura.facingMode).toBe("environment");
      expect(captura.file.type).toBe("image/jpeg");
      expect(captura.file.name).toMatch(/\.jpg$/);
      expect(await captura.file.text()).toBe("1280x720");
    });

    it("recusa capturar antes do vídeo ter imagem", async () => {
      const { camera } = await cameraAtiva(0, 0);
      mockCanvas();

      await expect(camera().capturar()).rejects.toThrow("não está pronta");
    });

    it("falha se o canvas não tiver contexto 2D", async () => {
      const { camera } = await cameraAtiva(640, 480);
      mockCanvas();
      vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);

      await expect(camera().capturar()).rejects.toThrow("Não foi possível capturar");
    });

    it("falha se o navegador não conseguir gerar a imagem", async () => {
      const { camera } = await cameraAtiva(640, 480);
      mockCanvas().toBlob.mockImplementation((callback) => callback(null));

      await expect(camera().capturar()).rejects.toThrow("Não foi possível capturar");
    });
  });
});
