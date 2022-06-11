import JSZip, { JSZipObject } from "jszip";
import {
  LayerType,
  Storyboard,
  StoryboardAnimation,
  StoryboardSprite,
  Origins,
  CommandType,
  Command,
  MoveCommand,
  MoveXCommand,
  MoveYCommand,
  FadeCommand,
  ScaleCommand,
  VectorScaleCommand,
  RotateCommand,
  ColourCommand,
  ParameterCommand,
} from "osu-classes";
import {
  Application,
  Container,
  IDestroyOptions,
  IPointData,
  Resource,
  Sprite,
  Texture,
} from "pixi.js";
import { EasingFunctions, lerp } from "../anim";
import { TimeMsProvider } from "../constants";

const ALL_LAYERS = [
  LayerType.Background,
  LayerType.Fail,
  LayerType.Pass,
  LayerType.Foreground,
  //   LayerType.Overlay,
  //   LayerType.Samples,
];

// prettier-ignore
const ORIGIN_MAP = new Map<Origins, IPointData>([
  [Origins.Custom,       { x: 0  , y: 0   }],
  [Origins.TopLeft,      { x: 0  , y: 0   }],
  [Origins.CentreLeft,   { x: 0  , y: 0.5 }],
  [Origins.BottomLeft,   { x: 0  , y: 1   }],
  [Origins.TopCentre,    { x: 0.5, y: 0   }],
  [Origins.Centre,       { x: 0.5, y: 0.5 }],
  [Origins.BottomCentre, { x: 0.5, y: 1   }],
  [Origins.TopRight,     { x: 1  , y: 0   }],
  [Origins.CentreRight,  { x: 1  , y: 0.5 }],
  [Origins.BottomRight,  { x: 1  , y: 1   }],
]);

const convertPath = (path: string) => path.replaceAll("\\", "/");

class OffsetCommand<T extends Command> {
  public base: T;
  private offset: number;

  public get startTime() {
    return this.base.startTime + this.offset;
  }

  public constructor(base: T, offset: number = 0) {
    this.base = base;
    this.offset = offset;
  }
}

abstract class AbstractStoryboardElementRenderer<
  T extends StoryboardSprite
> extends Sprite {
  private activeMoveXCommand: OffsetCommand<MoveXCommand | MoveCommand> | null =
    null;
  private activeMoveYCommand: OffsetCommand<MoveYCommand | MoveCommand> | null =
    null;
  private activeFadeCommand: OffsetCommand<FadeCommand> | null = null;
  private activeScaleCommand: OffsetCommand<
    ScaleCommand | VectorScaleCommand
  > | null = null;
  private activeRotationCommand: OffsetCommand<RotateCommand> | null = null;
  private activeColourCommand: OffsetCommand<ColourCommand> | null = null;

  protected startTime: number;
  protected app: Application;
  protected clock: TimeMsProvider;
  protected data: T;

  public spriteFiles: string[];
  public abstract load(textures: Map<string, Texture>): void;

  private commandQueue: OffsetCommand<Command>[] = [];

  private activateMoveCommand(command: OffsetCommand<MoveCommand>) {
    if (command.base.duration == 0) {
      this.activeMoveXCommand = null;
      this.activeMoveYCommand = null;
      this.position.copyFrom(command.base.endPosition);
    } else {
      this.activeMoveXCommand = command;
      this.activeMoveYCommand = command;
    }
  }
  private activateMoveXCommand(command: OffsetCommand<MoveXCommand>) {
    if (command.base.duration == 0) {
      this.activeMoveXCommand = null;
      this.x = command.base.endX;
    } else {
      this.activeMoveXCommand = command;
    }
  }
  private activateMoveYCommand(command: OffsetCommand<MoveYCommand>) {
    if (command.base.duration == 0) {
      this.activeMoveXCommand = null;
      this.y = command.base.endY;
    } else {
      this.activeMoveYCommand = command;
    }
  }
  private activateFadeCommand(command: OffsetCommand<FadeCommand>) {
    if (command.base.duration == 0) {
      this.activeMoveXCommand = null;
      this.alpha = command.base.endOpacity;
    } else {
      this.activeFadeCommand = command;
    }
  }
  private activateScaleCommand(
    command: OffsetCommand<ScaleCommand | VectorScaleCommand>
  ) {
    if (command.base.duration == 0) {
      this.activeScaleCommand = null;
      this.scale.copyFrom(command.base.endScale);
    } else {
      this.activeScaleCommand = command;
    }
  }
  private activateRotationCommand(command: OffsetCommand<RotateCommand>) {
    if (command.base.duration == 0) {
      this.activeRotationCommand = null;
      this.rotation = command.base.endRotate;
    } else {
      this.activeRotationCommand = command;
    }
  }
  private activateColourCommand(command: OffsetCommand<ColourCommand>) {}

  private processCommand<T extends Command>(command: OffsetCommand<T>) {
    return EasingFunctions.getEasingFn(command.base.easing)(
      (this.clock() - command.startTime) / command.base.duration
    );
  }

  private processMoveXCommand() {
    const p = this.processCommand(this.activeMoveXCommand!);
    this.x = lerp(
      p,
      this.activeMoveXCommand!.base.startX,
      this.activeMoveXCommand!.base.endX
    );
    if (p == 1) this.activeMoveXCommand = null;
  }
  private processMoveYCommand() {
    const p = this.processCommand(this.activeMoveYCommand!);
    this.y = lerp(
      p,
      this.activeMoveYCommand!.base.startY,
      this.activeMoveYCommand!.base.endY
    );
    if (p == 1) this.activeMoveYCommand = null;
  }
  private processFadeCommand() {
    const p = this.processCommand(this.activeFadeCommand!);
    this.alpha = lerp(
      p,
      this.activeFadeCommand!.base.startOpacity,
      this.activeFadeCommand!.base.startOpacity
    );
    if (p == 1) this.activeFadeCommand = null;
  }
  private processScaleCommand() {
    const p = this.processCommand(this.activeScaleCommand!);
    this.scale.x = lerp(
      p,
      this.activeScaleCommand!.base.startScale.x,
      this.activeScaleCommand!.base.endScale.x
    );
    this.scale.y = lerp(
      p,
      this.activeScaleCommand!.base.startScale.y,
      this.activeScaleCommand!.base.endScale.y
    );
    if (p == 1) this.activeScaleCommand = null;
  }
  private processRotationCommand() {
    const p = this.processCommand(this.activeRotationCommand!);
    this.rotation = lerp(
      p,
      this.activeRotationCommand!.base.startRotate,
      this.activeRotationCommand!.base.endRotate
    );
    if (p == 1) this.activeRotationCommand = null;
  }
  private processColourCommand() {
    const now = this.clock();
  }

  constructor(
    app: Application,
    clock: TimeMsProvider,
    data: T,
    spriteFiles: string[]
  ) {
    super();
    this.app = app;
    this.clock = clock;
    this.data = data;
    this.spriteFiles = spriteFiles;

    this.anchor.copyFrom(ORIGIN_MAP.get(data.origin)!);
    this.position.copyFrom(data.startPosition);

    this.commandQueue.push(
      ...data.commands.map((command) => new OffsetCommand(command))
    );
    // Unroll loops
    for (const loop of data.loops) {
      const interval = loop.commandsEndTime;
      for (let n = 0; n < loop.loopCount; n++) {
        const offset = loop.startTime + n * interval;
        this.commandQueue.push(
          ...loop.commands.map((command) => new OffsetCommand(command, offset))
        );
      }
    }
    this.commandQueue.sort((a, b) => a.startTime - b.startTime);

    this.startTime =
      this.commandQueue.length > 0
        ? this.commandQueue[0].startTime
        : this.data.startTime;

    this.visible = false;

    app.ticker.add(this.tick, this);

    if (data.filePath.indexOf("White") >= 0) {
      console.log(this, this.position);
    }
  }

  protected tick() {
    const now = this.clock();

    if (!this.visible && now < this.startTime) {
      return;
    }
    if (!this.visible) {
      this.visible = true;
    }
    if (
      now >= this.data.endTime &&
      this.activeMoveXCommand == null &&
      this.activeMoveYCommand == null &&
      this.activeFadeCommand == null &&
      this.activeScaleCommand == null &&
      this.activeRotationCommand == null &&
      this.activeColourCommand == null &&
      this.commandQueue.length == 0
    ) {
      this.destroy();
      return;
    }

    while (this.commandQueue.length > 0 && this.startTime <= now) {
      const command = this.commandQueue.shift()!;
      switch (command.base.type) {
        case CommandType.Movement:
          this.activateMoveCommand(command as OffsetCommand<MoveCommand>);
          break;
        case CommandType.MovementX:
          this.activateMoveXCommand(command as OffsetCommand<MoveXCommand>);
          break;
        case CommandType.MovementY:
          this.activateMoveYCommand(command as OffsetCommand<MoveYCommand>);
          break;
        case CommandType.Fade:
          this.activateFadeCommand(command as OffsetCommand<FadeCommand>);
          break;
        case CommandType.Scale:
        case CommandType.VectorScale:
          this.activateScaleCommand(
            command as OffsetCommand<ScaleCommand | VectorScaleCommand>
          );
          break;
        case CommandType.Rotation:
          this.activateRotationCommand(command as OffsetCommand<RotateCommand>);
          break;
        case CommandType.Colour:
          this.activateColourCommand(command as OffsetCommand<ColourCommand>);
          break;
        case CommandType.Parameter:
          debugger;
          break;
        default:
          console.warn("Ignoring command, don't know how to process", command);
      }
    }

    this.activeMoveXCommand && this.processMoveXCommand();
    this.activeMoveYCommand && this.processMoveYCommand();
    this.activeFadeCommand && this.processFadeCommand();
    this.activeScaleCommand && this.processScaleCommand();
    this.activeRotationCommand && this.processRotationCommand();
    this.activeColourCommand && this.processColourCommand();
  }

  destroy(options?: boolean | IDestroyOptions): void {
    super.destroy(options);
    this.app.ticker.remove(this.tick, this);
  }
}

class StoryboardSpriteRenderer extends AbstractStoryboardElementRenderer<StoryboardSprite> {
  public load(textures: Map<string, Texture<Resource>>): void {
    const texture = textures.get(this.spriteFiles[0]);
    texture && (this.texture = texture);
  }

  constructor(app: Application, clock: TimeMsProvider, data: StoryboardSprite) {
    super(app, clock, data, [convertPath(data.filePath)]);
  }
}

class StoryboardAnimationRenderer extends AbstractStoryboardElementRenderer<StoryboardAnimation> {
  public load(textures: Map<string, Texture<Resource>>): void {
    // TODO: Animate
    const texture = textures.get(this.spriteFiles[0]);
    texture && (this.texture = texture);
  }

  constructor(
    app: Application,
    clock: TimeMsProvider,
    data: StoryboardAnimation
  ) {
    const inputPath = convertPath(data.filePath);
    const dotIndex = inputPath.lastIndexOf(".");
    const basePath = inputPath.substring(0, dotIndex);
    const extension = inputPath.substring(dotIndex);

    const spriteFiles: string[] = [];
    for (let n = 0; n < data.frames; n++) {
      spriteFiles.push(basePath + n + extension);
    }

    super(app, clock, data, spriteFiles);
  }
}

export class StoryboardRenderer extends Container {
  private app: Application;
  private zip: JSZip;
  private clock: TimeMsProvider;
  private data: Storyboard;
  private layers = new Map<LayerType, Container>();

  public constructor(
    app: Application,
    zip: JSZip,
    clock: TimeMsProvider,
    data: Storyboard
  ) {
    super();
    this.app = app;
    this.zip = zip;
    this.clock = clock;
    this.data = data;
    for (const layerType of ALL_LAYERS) {
      const layerData = data.getLayer(layerType);

      const layer = new Container();
      this.layers.set(layerType, layer);
      this.addChild(layer);

      for (const elementData of layerData) {
        let element: AbstractStoryboardElementRenderer<StoryboardSprite>;
        if (elementData instanceof StoryboardAnimation) {
          element = new StoryboardAnimationRenderer(app, clock, elementData);
        } else if (elementData instanceof StoryboardSprite) {
          element = new StoryboardSpriteRenderer(app, clock, elementData);
        } else {
          console.error("Unknown element", elementData);
          continue;
        }

        layer.addChild(element);
      }
    }
  }

  private async loadTexture(object: JSZipObject): Promise<Texture> {
    const blob = await object.async("blob");
    const url = URL.createObjectURL(blob);
    return Texture.from(url);
  }

  public async load(): Promise<void> {
    const zipObjects = new Map<string, JSZipObject>();

    const allElements = [...this.layers.values()].flatMap(
      (layer) => layer.children
    ) as AbstractStoryboardElementRenderer<StoryboardSprite>[];

    for (const element of allElements) {
      for (const fileName of element.spriteFiles) {
        if (!zipObjects.has(fileName)) {
          const file =
            this.zip.filter(
              (path) =>
                (path + "@2x").toLocaleLowerCase() == fileName.toLowerCase()
            )[0] ||
            this.zip.filter(
              (path) => path.toLocaleLowerCase() == fileName.toLowerCase()
            )[0];

          if (file) {
            zipObjects.set(fileName, file);
          } else {
            console.error("Couldn't find file", fileName, this.zip);
          }
        }
      }
    }

    const promises = [...zipObjects.entries()].map(
      async ([key, object]): Promise<[string, Texture]> => [
        key,
        await this.loadTexture(object),
      ]
    );

    const textures = new Map(await Promise.all(promises));

    for (const element of allElements) {
      element.load(textures);
    }
  }
}
