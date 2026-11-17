<?php

it('returns the API health status', function () {
    $this->getJson('/api/health')
        ->assertOk()
        ->assertExactJson([
            'status' => 'ok',
            'app' => 'motor-co',
        ]);
});
