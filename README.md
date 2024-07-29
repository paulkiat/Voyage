// Sec Rules
// 1. Write stuff that isn't susceptible to buffer overflow and memory leaks
// 2. Make sure the memory that the app references can't be altered
// --> And it can only run code from that memory block
// --> And it can't be tricked to run code from another part of memory where a bady guy saved a malicious script
// 3. Local storage can be tracked by local edr agent
// 4. Do not allow app to have code injected

