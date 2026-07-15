function isPushEventType(request, reply) {
  const { "X-GitHub-Event": event } = request.headers;
  if (event !== "push") {
    return reply
      .code(200)
      .send({ message: "Not a push event", status: "success" });
  }
}

module.exports = isPushEventType;
