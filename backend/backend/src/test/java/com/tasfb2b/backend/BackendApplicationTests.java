package com.tasfb2b.backend;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@EnabledIfEnvironmentVariable(named = "DB_HOST", matches = ".*", disabledReason = "Requiere PostgreSQL para cargar contexto")
class BackendApplicationTests {

	@Test
	void contextLoads() {
	}

}
