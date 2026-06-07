import { MatchQueueService } from "./match-queue.service";

describe("MatchQueueService", () => {
  let fakeRedis: {
    lpush: jest.Mock;
    rpop: jest.Mock;
    lrange: jest.Mock;
    lrem: jest.Mock;
  };
  let svc: MatchQueueService;

  beforeEach(() => {
    fakeRedis = {
      lpush: jest.fn().mockResolvedValue(1),
      rpop: jest.fn(),
      lrange: jest.fn().mockResolvedValue([]),
      lrem: jest.fn().mockResolvedValue(1),
    };
    svc = new MatchQueueService({ client: fakeRedis as never } as never);
  });

  it("uses a default key when no filters supplied", async () => {
    await svc.push({}, { userId: "u1", sessionId: "s1" });
    expect(fakeRedis.lpush).toHaveBeenCalledWith(
      "trustlayer:match:any:any:any",
      expect.any(String),
    );
  });

  it("namespaces by mood/topic/language", async () => {
    await svc.push(
      { mood: "Calm", topic: "Books", language: "EN" },
      { userId: "u1", sessionId: "s1" },
    );
    expect(fakeRedis.lpush).toHaveBeenCalledWith(
      "trustlayer:match:calm:books:en",
      expect.any(String),
    );
  });

  it("returns null when queue is empty", async () => {
    fakeRedis.rpop.mockResolvedValue(null);
    const r = await svc.pop({});
    expect(r).toBeNull();
  });

  it("parses the popped entry", async () => {
    fakeRedis.rpop.mockResolvedValue(
      JSON.stringify({ userId: "u2", sessionId: "s2" }),
    );
    const r = await svc.pop({});
    expect(r).toEqual({ userId: "u2", sessionId: "s2" });
  });
});
